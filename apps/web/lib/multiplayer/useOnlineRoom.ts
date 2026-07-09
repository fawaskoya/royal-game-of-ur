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
import { SupabaseRoomTransport, createOnlineRoom, joinOnlineRoom, requestRematch } from "./supabaseTransport";
import { getSupabaseClient } from "./supabaseClient";
import type { GameMode } from "@/lib/useGame";
import { recordResult, resultFromGame } from "@/lib/stats/matchResults";
import { archiveGame } from "@/lib/archive";

export type UseOnlineRoomResult = UseLocalRoomResult & {
  /** Last transport-level failure worth showing inline (e.g. "not your turn"). */
  actionError: string | null;
  /** Handles by seat, once known: [light, dark]. */
  handles: readonly [string | null, string | null];
  /** True once the finished game has a successor waiting (either side asked). */
  rematchOffered: boolean;
  /** Create or follow the rematch for the finished game. */
  rematch(): void;
};

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

  const transportRef = useRef<SupabaseRoomTransport | null>(null);
  const gameIdRef = useRef<string | null>(null);
  const logRef = useRef<GameEvent[]>([]);
  const pendingRef = useRef<Map<number, GameEvent>>(new Map());
  const rulesetRef = useRef<RulesetConfig | null>(null);
  const busyRef = useRef(false);
  const startedAtRef = useRef<string>(new Date().toISOString());
  const recordedRef = useRef<string | null>(null);

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
      if (fresh.length > 0) rebuild(fresh);
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
        setPhase((current) => (current === "error" ? current : roster.length >= 2 ? "playing" : "waiting"));
      });
      transport.onRematch(() => setRematchOffered(true));
      await transport.connect(gameId, "");
      rulesetRef.current = transport.ruleset;
      setMySeat(transport.mySeat);
      setCode(roomCode);
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
          await attach(gameId, cleaned);
        } catch (err) {
          setError(err instanceof Error ? err.message : "could not join the room");
          setPhase("error");
        }
      })();
    },
    [attach],
  );

  const leave = useCallback(() => {
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
  }, []);

  useEffect(() => () => transportRef.current?.disconnect(), []);

  const state = snapshot?.state ?? null;
  const gamePhase = state ? phaseOf(state) : null;
  const myTurn = state !== null && mySeat !== null && state.winner === null && state.current === mySeat;
  const legal = state && myTurn && gamePhase === "awaiting-move" ? legalMoves(state) : [];

  const act = useCallback((action: () => Promise<void>) => {
    // One in-flight action at a time; server-side staleness checks make
    // double-sends harmless, this just avoids noisy duplicate errors.
    if (busyRef.current) return;
    busyRef.current = true;
    setActionError(null);
    void action()
      .catch((err) => setActionError(err instanceof Error ? err.message : "action failed"))
      .finally(() => {
        busyRef.current = false;
      });
  }, []);

  const roll = useCallback(() => {
    if (!myTurn || gamePhase !== "awaiting-roll" || !gameIdRef.current) return;
    const gameId = gameIdRef.current;
    act(() => transportRef.current!.requestRoll(gameId, logRef.current.length));
  }, [myTurn, gamePhase, act]);

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

  const movePiece = useCallback(
    (move: Move) => {
      if (!myTurn || gamePhase !== "awaiting-move" || !gameIdRef.current) return;
      const gameId = gameIdRef.current;
      act(() =>
        transportRef.current!.sendMove({
          roomId: gameId,
          gameId,
          afterEvent: logRef.current.length,
          move,
        }),
      );
    },
    [myTurn, gamePhase, act],
  );

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
    leave,
    roll,
    movePiece,
  };
}
