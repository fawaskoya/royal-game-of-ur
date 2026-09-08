"use client";

/**
 * Room lifecycle + verified client state for local-room multiplayer.
 * The client never trusts itself: every event batch from the (embedded)
 * server is appended to the log and the whole game is rebuilt through
 * `buildStateFromEvents`, which re-validates every event.
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
  type PlayerId,
  type RulesetConfig,
} from "@ur/engine";
import type { RoomPlayer } from "@/lib/network/types";
import { LocalRoomHost, LocalRoomTransport, makeRoomCode } from "./localRoom";
import {
  sideOf,
  trackFirstRoll,
  trackGameComplete,
  trackGameStart,
  trackRoomCreated,
  trackRoomJoined,
} from "@/lib/analytics";

export type RoomPhase = "idle" | "waiting" | "playing" | "error";

export interface UseLocalRoomResult {
  phase: RoomPhase;
  code: string | null;
  mySeat: PlayerId | null;
  players: readonly RoomPlayer[];
  state: GameState | null;
  legal: readonly Move[];
  tail: readonly GameEvent[];
  myTurn: boolean;
  canRoll: boolean;
  canMove: boolean;
  error: string | null;
  host(): void;
  join(code: string): void;
  leave(): void;
  roll(): void;
  movePiece(move: Move): void;
}

export function useLocalRoom(): UseLocalRoomResult {
  const [phase, setPhase] = useState<RoomPhase>("idle");
  const [code, setCode] = useState<string | null>(null);
  const [mySeat, setMySeat] = useState<PlayerId | null>(null);
  const [players, setPlayers] = useState<readonly RoomPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<{ state: GameState; tail: readonly GameEvent[] } | null>(null);

  const hostRef = useRef<LocalRoomHost | null>(null);
  const transportRef = useRef<LocalRoomTransport | null>(null);
  const logRef = useRef<GameEvent[]>([]);
  const rulesetRef = useRef<RulesetConfig | null>(null);

  // Same-device rooms report as `private` — the surface is Private room,
  // just on the local wire. Guards are keyed on the room code (one game per
  // room here), and leave() reads live state through a ref so it can keep a
  // stable identity: it doubles as this hook's unmount cleanup.
  const startedRef = useRef<string | null>(null);
  const outcomeRef = useRef<string | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());
  const liveRef = useRef<{ state: GameState | null; code: string | null }>({ state: null, code: null });

  const rebuild = useCallback((tail: readonly GameEvent[]) => {
    const ruleset = rulesetRef.current;
    if (!ruleset) return;
    try {
      const state = logRef.current.length === 0 ? createGame(ruleset) : buildStateFromEvents(ruleset, logRef.current);
      setSnapshot({ state, tail });
    } catch {
      // A batch that fails verification means a corrupted wire — bail loudly.
      setError("Game state failed verification — the room is out of sync.");
      setPhase("error");
    }
  }, []);

  const attach = useCallback(
    (transport: LocalRoomTransport, roomCode: string) => {
      transportRef.current = transport;
      transport.onWelcome((seat, ruleset, events, roster) => {
        setMySeat(seat);
        rulesetRef.current = ruleset;
        logRef.current = [...events];
        setPlayers(roster);
        setPhase(roster.length >= 2 ? "playing" : "waiting");
        rebuild([]);
      });
      transport.onEvents((batch) => {
        // Append-only with staleness guard: drop already-known prefixes.
        if (batch.fromIndex > logRef.current.length) return; // gap — impossible locally
        const fresh = batch.events.slice(Math.max(0, logRef.current.length - batch.fromIndex));
        if (fresh.length === 0) return;
        logRef.current = [...logRef.current, ...fresh];
        rebuild(fresh);
      });
      transport.onPlayersChanged((roster) => {
        setPlayers(roster);
        setPhase((current) => {
          if (current === "error") return current;
          if (roster.length >= 2) return "playing";
          return roster.length === 0 ? "error" : "waiting";
        });
        if (roster.length === 0) setError("The host closed the room.");
      });
      transport.onStatusChanged((status) => {
        if (status === "closed" && phaseRef.current !== "error") {
          setError((prev) => prev ?? "Room is full or the connection closed.");
          setPhase("error");
        }
      });
      void transport.connect(roomCode, "Player");
    },
    [rebuild],
  );

  // phase mirror for the status callback above (avoids stale closure).
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const host = useCallback(() => {
    const roomCode = makeRoomCode();
    const roomHost = new LocalRoomHost(roomCode, "Host");
    hostRef.current = roomHost;
    setCode(roomCode);
    setError(null);
    startedAtRef.current = new Date().toISOString();
    trackRoomCreated();
    attach(new LocalRoomTransport(roomHost), roomCode);
  }, [attach]);

  const join = useCallback(
    (roomCode: string) => {
      const cleaned = roomCode.trim().toUpperCase();
      if (cleaned.length !== 4) {
        setError("Room codes are 4 letters.");
        return;
      }
      setCode(cleaned);
      setError(null);
      setPhase("waiting");
      startedAtRef.current = new Date().toISOString();
      trackRoomJoined();
      attach(new LocalRoomTransport(null), cleaned);
    },
    [attach],
  );

  const leave = useCallback(() => {
    const { state: live, code: roomCode } = liveRef.current;
    if (live && roomCode && live.winner === null && live.history.length > 0 && outcomeRef.current !== roomCode) {
      outcomeRef.current = roomCode;
      const started = new Date(startedAtRef.current).getTime();
      trackGameComplete({
        mode: "private",
        result: "abandoned",
        difficulty: null,
        turns: live.rollCount,
        durationMs: Number.isFinite(started) ? Math.max(0, Date.now() - started) : 0,
      });
    }
    transportRef.current?.disconnect();
    hostRef.current?.close();
    transportRef.current = null;
    hostRef.current = null;
    logRef.current = [];
    rulesetRef.current = null;
    setSnapshot(null);
    setPhase("idle");
    setCode(null);
    setMySeat(null);
    setPlayers([]);
    setError(null);
  }, []);

  useEffect(() => () => leave(), [leave]);

  const state = snapshot?.state ?? null;
  liveRef.current = { state, code };
  const gamePhase = state ? phaseOf(state) : null;
  const myTurn = state !== null && mySeat !== null && state.winner === null && state.current === mySeat;
  const legal = state && myTurn && gamePhase === "awaiting-move" ? legalMoves(state) : [];

  const roll = useCallback(() => {
    if (!myTurn || gamePhase !== "awaiting-roll") return;
    trackFirstRoll("private");
    void transportRef.current?.requestRoll(code ?? "", logRef.current.length);
  }, [myTurn, gamePhase, code]);

  const movePiece = useCallback(
    (move: Move) => {
      if (!myTurn || gamePhase !== "awaiting-move") return;
      void transportRef.current?.sendMove({
        roomId: code ?? "",
        gameId: code ?? "",
        afterEvent: logRef.current.length,
        move,
      });
    },
    [myTurn, gamePhase, code],
  );

  // Both seats filled — the board is live.
  useEffect(() => {
    if (phase !== "playing" || !code || mySeat === null) return;
    if (startedRef.current === code) return;
    startedRef.current = code;
    trackGameStart({ mode: "private", difficulty: null, side: sideOf(mySeat) });
  }, [phase, code, mySeat]);

  useEffect(() => {
    if (state?.winner == null || !code) return;
    if (outcomeRef.current === code) return;
    outcomeRef.current = code;
    const started = new Date(startedAtRef.current).getTime();
    trackGameComplete({
      mode: "private",
      // Two humans share this device, so there is no single "you" to win.
      result: "finished",
      difficulty: null,
      turns: state.rollCount,
      durationMs: Number.isFinite(started) ? Math.max(0, Date.now() - started) : 0,
    });
  }, [state, code]);

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
    host,
    join,
    leave,
    roll,
    movePiece,
  };
}
