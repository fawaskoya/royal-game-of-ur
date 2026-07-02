"use client";

/**
 * All web game logic lives here. Components below this hook only render and
 * forward input — every rule decision comes from @ur/engine, every AI move
 * from @ur/ai. See CLAUDE.md invariants.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GameSession,
  createRng,
  legalMoves as engineLegalMoves,
  phaseOf,
  type GameEvent,
  type GameState,
  type Move,
  type Phase,
  type PlayerId,
  type Rng,
} from "@ur/engine";
import { createAgent, type DifficultyId, type UrAgent } from "@ur/ai";

export type GameMode =
  | { kind: "pvp" }
  | { kind: "ai"; human: PlayerId; difficulty: DifficultyId }
  | { kind: "watch"; light: DifficultyId; dark: DifficultyId };

export type Controller = "human" | DifficultyId;

export function controllerOf(mode: GameMode, player: PlayerId): Controller {
  switch (mode.kind) {
    case "pvp":
      return "human";
    case "ai":
      return player === mode.human ? "human" : mode.difficulty;
    case "watch":
      return player === 0 ? mode.light : mode.dark;
  }
}

const AI_ROLL_DELAY_MS = 650;
const AI_MOVE_DELAY_MS = 750;

export interface UseGameResult {
  state: GameState;
  phase: Phase;
  /** Legal moves for the pending roll (empty while awaiting a roll). */
  legal: readonly Move[];
  /** Events appended by the most recent action — the animation/announcement source. */
  tail: readonly GameEvent[];
  mode: GameMode;
  /** True while the acting player is an AI (used to lock input and show thinking). */
  aiTurn: boolean;
  humanCanRoll: boolean;
  humanCanMove: boolean;
  canUndo: boolean;
  roll(): void;
  movePiece(move: Move): void;
  undo(): void;
  newGame(): void;
}

interface Snapshot {
  state: GameState;
  tail: readonly GameEvent[];
}

export function useGame(mode: GameMode): UseGameResult {
  const sessionRef = useRef<GameSession | null>(null);
  if (sessionRef.current === null) sessionRef.current = new GameSession({});
  const agentRngRef = useRef<Rng | null>(null);
  if (agentRngRef.current === null) agentRngRef.current = createRng(Date.now() >>> 0);
  const agentsRef = useRef(new Map<DifficultyId, UrAgent>());

  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({
    state: sessionRef.current!.state,
    tail: [],
  }));

  const commit = useCallback((action: (session: GameSession) => void) => {
    const session = sessionRef.current!;
    const before = session.state.history.length;
    action(session);
    setSnapshot({ state: session.state, tail: session.state.history.slice(before) });
  }, []);

  const state = snapshot.state;
  const phase = phaseOf(state);
  const legal = useMemo(() => engineLegalMoves(state), [state]);

  const acting: Controller = state.winner === null ? controllerOf(mode, state.current) : "human";
  const aiTurn = state.winner === null && acting !== "human";

  const roll = useCallback(() => {
    if (phaseOf(sessionRef.current!.state) !== "awaiting-roll") return;
    commit((session) => session.roll());
  }, [commit]);

  const movePiece = useCallback(
    (move: Move) => {
      if (phaseOf(sessionRef.current!.state) !== "awaiting-move") return;
      commit((session) => session.move(move));
    },
    [commit],
  );

  const undo = useCallback(() => {
    if (mode.kind === "watch") return;
    if (sessionRef.current!.state.history.length === 0) return;
    if (mode.kind === "ai") commit((session) => session.undoToPlayerRoll(mode.human));
    else commit((session) => session.undo());
  }, [commit, mode]);

  const newGame = useCallback(() => {
    sessionRef.current = new GameSession({});
    setSnapshot({ state: sessionRef.current.state, tail: [] });
  }, []);

  // AI driver: whenever it's an AI's turn, schedule its next action with a
  // human-feeling delay. Every state change re-arms the effect, so rosette
  // chains and forced passes flow naturally.
  useEffect(() => {
    if (!aiTurn) return;
    const difficulty = acting as DifficultyId;
    const delay = phase === "awaiting-roll" ? AI_ROLL_DELAY_MS : AI_MOVE_DELAY_MS;
    const timer = setTimeout(() => {
      const session = sessionRef.current!;
      const currentPhase = phaseOf(session.state);
      if (currentPhase === "awaiting-roll") {
        commit((s) => s.roll());
      } else if (currentPhase === "awaiting-move") {
        let agent = agentsRef.current.get(difficulty);
        if (!agent) {
          agent = createAgent(difficulty);
          agentsRef.current.set(difficulty, agent);
        }
        const moves = session.legalMoves();
        if (moves.length > 0) {
          const move = agent.chooseMove(session.state, moves, { rng: agentRngRef.current! });
          commit((s) => s.move(move));
        }
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [aiTurn, acting, phase, state, commit]);

  return {
    state,
    phase,
    legal,
    tail: snapshot.tail,
    mode,
    aiTurn,
    humanCanRoll: !aiTurn && phase === "awaiting-roll",
    humanCanMove: !aiTurn && phase === "awaiting-move",
    canUndo: mode.kind !== "watch" && state.history.length > 0 && !aiTurn,
    roll,
    movePiece,
    undo,
    newGame,
  };
}
