"use client";

/**
 * Internet rooms over `SupabaseRoomTransport` — same result shape as
 * `useLocalRoom`, so `RoomGameScreen` renders either without knowing which
 * wire it's on.
 *
 * Trust model unchanged: the client applies nothing itself. Every batch is
 * slotted by seq into the log and the whole game is rebuilt through
 * `buildStateFromEvents` (full re-verification). If slotting ever detects a
 * gap it can't fill, it asks the transport to resync from Postgres.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyMove,
  buildStateFromEvents,
  createGame,
  legalMoves,
  phaseOf,
  type GameEvent,
  type GameState,
  type Move,
  type RulesetConfig,
} from "@ur/engine";
import type { RoomPlayer } from "@/lib/network/types";
import type { UseLocalRoomResult } from "./useLocalRoom";
import {
  ONLINE_TURN_TIMEOUT_SECONDS,
  SupabaseRoomTransport,
  claimTimeout as claimTimeoutAction,
  createOnlineRoom,
  joinOnlineRoom,
  requestRematch,
  resignGame,
  type GameEndedSignal,
} from "./supabaseTransport";
import { getSupabaseClient } from "./supabaseClient";
import { forgetActiveGame, rememberActiveGame } from "./activeGame";
import type { GameMode } from "@/lib/useGame";
import { recordResult, resultFromGame } from "@/lib/stats/matchResults";
import { archiveGame } from "@/lib/archive";
import {
  sideOf,
  trackFirstRoll,
  trackGameComplete,
  trackGameStart,
  trackRoomCreated,
  trackRoomJoined,
  type AnalyticsMode,
} from "@/lib/analytics";

export type UseOnlineRoomResult = UseLocalRoomResult & {
  /** Last transport-level failure worth showing inline (e.g. "not your turn"). */
  actionError: string | null;
  /** Handles by seat, once known: [light, dark]. */
  handles: readonly [string | null, string | null];
  /** True once the finished game has a successor waiting (either side asked). */
  rematchOffered: boolean;
  /** Create or follow the rematch for the finished game. */
  rematch(): void;
  /** Open a matchmade game by id (no invite code). */
  joinGameId(gameId: string, label?: string): void;
  /** Authoritative game-over signal (covers resign/timeout, which never
   * appear in the engine event log). Null while the game is live. */
  ended: GameEndedSignal | null;
  /** Concede the game (opponent wins, rated as a normal loss). */
  resign(): void;
  /** Claim victory on the opponent's expired turn clock. */
  claimTimeout(): void;
  /** Epoch ms when the current turn's clock expires (display; server decides). */
  turnDeadlineMs: number | null;
  /** A throw is in flight — the dice are still in the air. */
  rolling: boolean;
  /** An action is awaiting the server. Optimistic rendering can hand the
   * turn straight back (a rosette), so input is gated on this rather than
   * letting the next click fall into a stale request. */
  busy: boolean;
};

/** Floor on how long the dice visibly tumble, even when the result is already
 * known locally — below this a throw stops reading as a throw. */
const MIN_TUMBLE_MS = 420;

export function useOnlineRoom(): UseOnlineRoomResult {
  const [phase, setPhase] = useState<UseLocalRoomResult["phase"]>("idle");
  const [code, setCode] = useState<string | null>(null);
  const [mySeat, setMySeat] = useState<UseLocalRoomResult["mySeat"]>(null);
  const [players, setPlayers] = useState<readonly RoomPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<{ state: GameState; tail: readonly GameEvent[] } | null>(null);
  const [handles, setHandles] = useState<readonly [string | null, string | null]>([null, null]);
  const [rematchOffered, setRematchOffered] = useState(false);
  const [ended, setEnded] = useState<GameEndedSignal | null>(null);
  const [lastActivityAt, setLastActivityAt] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [busy, setBusy] = useState(false);

  const transportRef = useRef<SupabaseRoomTransport | null>(null);
  const gameIdRef = useRef<string | null>(null);
  const logRef = useRef<GameEvent[]>([]);
  const pendingRef = useRef<Map<number, GameEvent>>(new Map());
  const rulesetRef = useRef<RulesetConfig | null>(null);
  const busyRef = useRef(false);
  /**
   * Events this client has already drawn ahead of the server's confirmation.
   * The verified log (`logRef`) is never touched by prediction — this only
   * records which incoming events have already been animated, so the
   * authoritative rebuild doesn't play the same move a second time.
   */
  const optimisticRef = useRef<{ fromIndex: number; count: number } | null>(null);

  /*
   * Pre-fired rolls.
   *
   * Rolling is not a decision in Ur — you must roll, the only choice is which
   * piece to move afterwards. So the request can go out the moment the turn
   * becomes yours and the result can sit here until you actually tap Roll,
   * which takes the whole round trip off the perceived clock.
   *
   * Holding it is the fiddly part: the roll is committed server-side the
   * instant we ask, and our own Realtime subscription would otherwise show
   * the dice before the player touched anything. So while a pre-fired roll is
   * outstanding, `ingest` queues incoming batches instead of applying them,
   * and tapping Roll releases the queue behind the tumble animation. The
   * verified log is still the only source of state — this only delays when it
   * is read.
   */
  const deferRef = useRef(false);
  const deferredRef = useRef<{ fromIndex: number; events: readonly GameEvent[] }[]>([]);
  const prefetchAtRef = useRef<number | null>(null);
  const prefetchRef = useRef<Promise<void> | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());
  const recordedRef = useRef<string | null>(null);

  // This one hook serves two surfaces: matchmaking (joinGameId) reports as
  // `online`, invite-code rooms (host/join) as `private`. Analytics guards
  // are keyed on game id so a rematch counts as a new game.
  const surfaceRef = useRef<AnalyticsMode>("private");
  const startedRef = useRef<string | null>(null);
  const outcomeRef = useRef<string | null>(null);
  // Mirrors for the abandonment check in leave(), which must keep a stable
  // identity — it is wired directly to exit buttons and (in useLocalRoom)
  // to an unmount cleanup, where a changing identity would re-fire it.
  const liveRef = useRef<{ state: GameState | null; ended: GameEndedSignal | null }>({
    state: null,
    ended: null,
  });

  const rebuild = useCallback((tail: readonly GameEvent[]) => {
    const ruleset = rulesetRef.current;
    if (!ruleset) return;
    try {
      const state = logRef.current.length === 0 ? createGame(ruleset) : buildStateFromEvents(ruleset, logRef.current);
      setSnapshot({ state, tail });
    } catch {
      setError("Game state failed verification — please rejoin the room.");
      setPhase("error");
    }
  }, []);

  /** Slot a batch by seq; apply the contiguous prefix; stash the rest. */
  const ingest = useCallback(
    (fromIndex: number, events: readonly GameEvent[]) => {
      // A pre-fired roll is waiting on the player's tap — queue, don't apply.
      if (deferRef.current) {
        deferredRef.current.push({ fromIndex, events });
        return;
      }
      events.forEach((event, i) => {
        const seq = fromIndex + i;
        if (seq >= logRef.current.length) pendingRef.current.set(seq, event);
      });
      const fresh: GameEvent[] = [];
      while (pendingRef.current.has(logRef.current.length)) {
        const next = pendingRef.current.get(logRef.current.length)!;
        pendingRef.current.delete(logRef.current.length);
        logRef.current.push(next);
        fresh.push(next);
      }
      if (fresh.length > 0) {
        const optimistic = optimisticRef.current;
        let tail = fresh;
        if (optimistic) {
          // Suppress the prefix we already drew optimistically; the state
          // itself is still rebuilt from the authoritative log below.
          const before = logRef.current.length - fresh.length;
          const shown = optimistic.fromIndex + optimistic.count - before;
          tail = fresh.slice(Math.max(0, Math.min(fresh.length, shown)));
          if (logRef.current.length >= optimistic.fromIndex + optimistic.count) {
            optimisticRef.current = null;
          }
        }
        rebuild(tail);
      }
      // Outside the `fresh` guard on purpose. Your own roll/move arrives
      // twice — first as the function's response (which carries no
      // server_ts), then as the Realtime echo, by which point the seq is
      // already in the log and `fresh` is empty. Anchoring only on fresh
      // events meant your own turn never advanced your own clock, so a
      // roll-then-move turn showed one 120s budget instead of 120s per
      // event, and a rosette chain never reset at all.
      const anchor = transportRef.current?.lastActivityAt ?? null;
      if (anchor !== null) setLastActivityAt(anchor);
      // A stranded future event means we missed something — pull the log.
      if (fresh.length === 0 && pendingRef.current.size > 0) {
        void transportRef.current?.resync().catch(() => undefined);
      }
    },
    [rebuild],
  );

  /** Fetch both seats' display names once the roster has real ids. */
  const resolveHandles = useCallback((roster: readonly RoomPlayer[]) => {
    const supabase = getSupabaseClient();
    const ids = roster.map((p) => p.id);
    if (!supabase || ids.length === 0) return;
    void supabase
      .from("profiles")
      .select("id, handle")
      .in("id", ids)
      .then(({ data }) => {
        if (!data) return;
        const bySeat: [string | null, string | null] = [null, null];
        for (const player of roster) {
          const row = data.find((r) => r.id === player.id);
          if (player.seat !== null && row?.handle) bySeat[player.seat] = row.handle as string;
        }
        setHandles(bySeat);
      });
  }, []);

  const attach = useCallback(
    async (gameId: string, roomCode: string) => {
      transportRef.current?.disconnect();
      logRef.current = [];
      pendingRef.current.clear();
      deferRef.current = false;
      deferredRef.current = [];
      prefetchRef.current = null;
      prefetchAtRef.current = null;
      setSnapshot(null);
      setRematchOffered(false);
      startedAtRef.current = new Date().toISOString();

      const transport = new SupabaseRoomTransport();
      transportRef.current = transport;
      gameIdRef.current = gameId;
      transport.onEvents((batch) => ingest(batch.fromIndex, batch.events));
      transport.onPlayersChanged((roster) => {
        setPlayers(roster);
        resolveHandles(roster);
        // The guest joining is what stamps started_at; re-read the anchor so
        // a host who waited in the lobby doesn't begin on a dead clock.
        const anchor = transportRef.current?.lastActivityAt ?? null;
        if (anchor !== null) setLastActivityAt(anchor);
        setPhase((current) => (current === "error" ? current : roster.length >= 2 ? "playing" : "waiting"));
      });
      transport.onRematch(() => setRematchOffered(true));
      transport.onGameEnded((signal) => setEnded(signal));
      await transport.connect(gameId, "");
      setEnded(null);
      setLastActivityAt(transport.lastActivityAt ?? Date.now());
      rulesetRef.current = transport.ruleset;
      setMySeat(transport.mySeat);
      setCode(roomCode);
      // The breadcrumb a reload follows back into this game. Matchmade games
      // have no room code, so the id is the only handle that survives.
      rememberActiveGame(gameId, roomCode || null);
      rebuild([]);
    },
    [ingest, rebuild, resolveHandles],
  );

  const host = useCallback(() => {
    setError(null);
    setPhase("waiting");
    void (async () => {
      try {
        const { gameId, roomCode } = await createOnlineRoom();
        surfaceRef.current = "private";
        trackRoomCreated();
        await attach(gameId, roomCode);
      } catch (err) {
        setError(err instanceof Error ? err.message : "could not create the room");
        setPhase("error");
      }
    })();
  }, [attach]);

  const join = useCallback(
    (roomCode: string) => {
      const cleaned = roomCode.trim().toUpperCase();
      if (cleaned.length !== 4) {
        setError("Room codes are 4 letters.");
        return;
      }
      setError(null);
      setPhase("waiting");
      void (async () => {
        try {
          const { gameId } = await joinOnlineRoom(cleaned);
          surfaceRef.current = "private";
          trackRoomJoined();
          await attach(gameId, cleaned);
        } catch (err) {
          setError(err instanceof Error ? err.message : "could not join the room");
          setPhase("error");
        }
      })();
    },
    [attach],
  );

  /** Join a matchmade game by id (no room code). */
  const joinGameId = useCallback(
    (gameId: string, label = "MATCH") => {
      setError(null);
      setPhase("waiting");
      surfaceRef.current = "online";
      void (async () => {
        try {
          await attach(gameId, label);
        } catch (err) {
          setError(err instanceof Error ? err.message : "could not open the match");
          setPhase("error");
        }
      })();
    },
    [attach],
  );

  const leave = useCallback(() => {
    // Walking out mid-game is an abandonment (the opponent is left to claim
    // the clock). Shares the outcome guard, so a decided game stays quiet.
    const { state: live, ended: over } = liveRef.current;
    const gameId = gameIdRef.current;
    if (live && gameId && !over && live.winner === null && live.history.length > 0 && outcomeRef.current !== gameId) {
      outcomeRef.current = gameId;
      const started = new Date(startedAtRef.current).getTime();
      trackGameComplete({
        mode: surfaceRef.current,
        result: "abandoned",
        difficulty: null,
        turns: live.rollCount,
        durationMs: Number.isFinite(started) ? Math.max(0, Date.now() - started) : 0,
      });
    }
    forgetActiveGame();
    deferRef.current = false;
    deferredRef.current = [];
    prefetchRef.current = null;
    prefetchAtRef.current = null;
    transportRef.current?.disconnect();
    transportRef.current = null;
    gameIdRef.current = null;
    logRef.current = [];
    pendingRef.current.clear();
    rulesetRef.current = null;
    setSnapshot(null);
    setPhase("idle");
    setCode(null);
    setMySeat(null);
    setPlayers([]);
    setError(null);
    setActionError(null);
    setHandles([null, null]);
    setRematchOffered(false);
    setEnded(null);
    setLastActivityAt(null);
  }, []);

  useEffect(() => () => transportRef.current?.disconnect(), []);

  const state = snapshot?.state ?? null;
  liveRef.current = { state, ended };

  // A board finish also lands here so the overlay has ONE source of truth.
  useEffect(() => {
    if (state?.winner != null) {
      setEnded((prev) => prev ?? { winner: state.winner as 0 | 1, endReason: "finish" });
    }
  }, [state?.winner]);
  const gamePhase = state ? phaseOf(state) : null;
  const myTurn = state !== null && mySeat !== null && state.winner === null && state.current === mySeat;
  const legal = state && myTurn && gamePhase === "awaiting-move" ? legalMoves(state) : [];

  const act = useCallback((action: () => Promise<void>, onError?: () => void) => {
    // One in-flight action at a time; server-side staleness checks make
    // double-sends harmless, this just avoids noisy duplicate errors.
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setActionError(null);
    void action()
      .catch((err) => {
        setActionError(err instanceof Error ? err.message : "action failed");
        onError?.();
      })
      .finally(() => {
        busyRef.current = false;
        setBusy(false);
      });
  }, []);

  /** Apply everything a pre-fired roll has been holding back. */
  const releaseDeferred = useCallback(() => {
    deferRef.current = false;
    prefetchRef.current = null;
    const queued = deferredRef.current;
    deferredRef.current = [];
    for (const batch of queued) ingest(batch.fromIndex, batch.events);
  }, [ingest]);

  /** Throw away a pre-fired roll's bookkeeping without applying it here. */
  const discardPrefetch = useCallback(() => {
    deferRef.current = false;
    deferredRef.current = [];
    prefetchRef.current = null;
    prefetchAtRef.current = null;
  }, []);

  /**
   * Ask for the roll as soon as the turn arrives, before the player taps.
   * Deliberately outside `act()`: this is background work, so it must not
   * light up the busy state or surface an error banner. If it fails we simply
   * fall back to asking again on the tap.
   */
  useEffect(() => {
    if (phase !== "playing" || ended) return;
    if (!myTurn || gamePhase !== "awaiting-roll") return;
    if (busyRef.current || rolling) return;
    const gameId = gameIdRef.current;
    const transport = transportRef.current;
    if (!gameId || !transport) return;
    const at = logRef.current.length;
    if (prefetchAtRef.current === at) return; // already asked for this position
    prefetchAtRef.current = at;
    deferRef.current = true;
    prefetchRef.current = transport.requestRoll(gameId, at).catch((err) => {
      discardPrefetch();
      throw err;
    });
    void prefetchRef.current.catch(() => undefined); // failure is handled on tap
  }, [phase, ended, myTurn, gamePhase, rolling, discardPrefetch]);

  // A game that has ended must not sit behind a held roll.
  useEffect(() => {
    if (ended && deferRef.current) releaseDeferred();
  }, [ended, releaseDeferred]);

  const roll = useCallback(() => {
    if (!myTurn || gamePhase !== "awaiting-roll" || !gameIdRef.current || rolling) return;
    const gameId = gameIdRef.current;
    trackFirstRoll(surfaceRef.current);
    setRolling(true);
    const startedAt = Date.now();

    // Even when the answer is already in hand, let the dice actually tumble —
    // an instant result reads as a glitch, not a throw.
    const settle = () => {
      const wait = Math.max(0, MIN_TUMBLE_MS - (Date.now() - startedAt));
      window.setTimeout(() => {
        releaseDeferred();
        setRolling(false);
      }, wait);
    };

    const live = () => {
      discardPrefetch();
      if (busyRef.current) {
        setRolling(false);
        return;
      }
      act(() =>
        transportRef
          .current!.requestRoll(gameId, logRef.current.length)
          .finally(() => setRolling(false)),
      );
    };

    const pending = prefetchRef.current;
    if (pending) void pending.then(settle, live);
    else live();
  }, [myTurn, gamePhase, rolling, act, releaseDeferred, discardPrefetch]);

  // The board is live once both seats are filled — that, not entering the
  // lobby, is when a game has begun. Keyed on game id so a rematch (which
  // attaches a new id) reports its own start.
  useEffect(() => {
    const gameId = gameIdRef.current;
    if (phase !== "playing" || !gameId || mySeat === null) return;
    if (startedRef.current === gameId) return;
    startedRef.current = gameId;
    trackGameStart({ mode: surfaceRef.current, difficulty: null, side: sideOf(mySeat) });
  }, [phase, mySeat]);

  // `ended` is the single game-over source (board finish, resign, timeout),
  // so completion rides it rather than the engine winner alone.
  // A finished game is nothing to come back to.
  useEffect(() => {
    if (ended) forgetActiveGame();
  }, [ended]);

  useEffect(() => {
    const gameId = gameIdRef.current;
    if (!ended || !gameId || mySeat === null) return;
    if (outcomeRef.current === gameId) return;
    outcomeRef.current = gameId;
    const started = new Date(startedAtRef.current).getTime();
    trackGameComplete({
      mode: surfaceRef.current,
      // Resign and timeout are rated exactly like an on-board loss, so they
      // report the same way here.
      result: ended.winner === mySeat ? "win" : "loss",
      difficulty: null,
      turns: state?.rollCount ?? 0,
      durationMs: Number.isFinite(started) ? Math.max(0, Date.now() - started) : 0,
    });
  }, [ended, mySeat, state]);

  // A finished online game joins the local record exactly once: a
  // MatchResult for Stats and a verifiable replay in the archive — the same
  // treatment local games get (AG-14).
  useEffect(() => {
    const finished = snapshot?.state;
    const gameId = gameIdRef.current;
    if (!finished || finished.winner === null || !gameId || mySeat === null) return;
    if (recordedRef.current === gameId) return;
    recordedRef.current = gameId;
    const mode: GameMode = { kind: "online", mySeat, opponent: handles[mySeat === 0 ? 1 : 0] };
    const result = resultFromGame(finished, mode, gameId, startedAtRef.current);
    if (result) recordResult(result);
    archiveGame(finished, mode, gameId);
  }, [snapshot, mySeat, handles]);

  const rematch = useCallback(() => {
    const gameId = gameIdRef.current;
    if (!gameId) return;
    act(async () => {
      const { gameId: nextId } = await requestRematch(gameId);
      await attach(nextId, code ?? "");
    });
  }, [act, attach, code]);

  /** Drop a prediction and fall back to the verified log (no re-animation). */
  const rollbackOptimistic = useCallback(() => {
    if (!optimisticRef.current) return;
    optimisticRef.current = null;
    rebuild([]);
  }, [rebuild]);

  const movePiece = useCallback(
    (move: Move) => {
      if (!myTurn || gamePhase !== "awaiting-move" || !gameIdRef.current || busyRef.current) return;
      const gameId = gameIdRef.current;
      const afterEvent = logRef.current.length;

      /*
       * Draw the move immediately instead of waiting out the round trip.
       *
       * This grants the client no authority it didn't already have: the
       * engine is deterministic, and this client rebuilt the position from
       * the same verified log the server holds, so the result of a legal move
       * is already computable here. The server still validates and its events
       * still replace this the moment they land — a prediction that turns out
       * wrong is corrected by the rebuild, or by the rollback below. The
       * verified log is never written from here.
       */
      if (state) {
        try {
          const predicted = applyMove(state, move);
          const drawn = predicted.history.slice(afterEvent);
          optimisticRef.current = { fromIndex: afterEvent, count: drawn.length };
          setSnapshot({ state: predicted, tail: drawn });
        } catch {
          // The engine refused it — send anyway and let the server's error
          // be the one the player sees.
          optimisticRef.current = null;
        }
      }

      act(
        () =>
          transportRef.current!.sendMove({
            roomId: gameId,
            gameId,
            afterEvent,
            move,
          }),
        rollbackOptimistic,
      );
    },
    [myTurn, gamePhase, act, state, rollbackOptimistic],
  );

  const resign = useCallback(() => {
    const gameId = gameIdRef.current;
    if (!gameId || ended) return;
    act(async () => {
      const result = await resignGame(gameId);
      setEnded((prev) => prev ?? result);
    });
  }, [act, ended]);

  const claimTimeout = useCallback(() => {
    const gameId = gameIdRef.current;
    if (!gameId || ended) return;
    act(async () => {
      const result = await claimTimeoutAction(gameId);
      if (!result.claimable) {
        setActionError(`Not yet — ${result.remainingSeconds ?? "?"}s on their clock (synced).`);
        // Trust the server's clock over ours: pull the countdown back.
        setLastActivityAt(Date.now() - (ONLINE_TURN_TIMEOUT_SECONDS - (result.remainingSeconds ?? 0)) * 1000);
        return;
      }
      if (result.winner !== undefined && result.endReason) {
        setEnded((prev) => prev ?? { winner: result.winner!, endReason: result.endReason! });
      }
    });
  }, [act, ended]);

  const turnDeadlineMs =
    phase === "playing" && !ended && lastActivityAt !== null
      ? lastActivityAt + ONLINE_TURN_TIMEOUT_SECONDS * 1000
      : null;

  return {
    phase,
    code,
    mySeat,
    players,
    state,
    legal,
    tail: snapshot?.tail ?? [],
    myTurn,
    canRoll: myTurn && gamePhase === "awaiting-roll" && phase === "playing",
    canMove: myTurn && gamePhase === "awaiting-move" && phase === "playing",
    error,
    actionError,
    handles,
    rematchOffered,
    rematch,
    host,
    join,
    joinGameId,
    leave,
    roll,
    movePiece,
    ended,
    resign,
    claimTimeout,
    turnDeadlineMs,
    rolling,
    busy,
  };
}
