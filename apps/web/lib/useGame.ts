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
import { clearGame, saveGame } from "@/lib/persistence/gameStorage";
import { CURRENT_SAVE_VERSION, type SavedGame } from "@/lib/persistence/saveSchema";
import { archiveGame } from "@/lib/archive";
import { recordResult, resultFromGame } from "@/lib/stats/matchResults";
import { analyticsMode, sideOf, trackFirstRoll, trackGameComplete, trackGameStart } from "@/lib/analytics";

export type GameMode =
  | { kind: "pvp" }
  | { kind: "ai"; human: PlayerId; difficulty: DifficultyId }
  | { kind: "watch"; light: DifficultyId; dark: DifficultyId }
  // Online games never run through useGame (the server drives them); the
  // kind exists so results/archive entries can carry who was played.
  | { kind: "online"; mySeat: PlayerId; opponent: string | null };

export type Controller = "human" | DifficultyId;

export function controllerOf(mode: GameMode, player: PlayerId): Controller {
  switch (mode.kind) {
    case "pvp":
      return "human";
    case "ai":
      return player === mode.human ? "human" : mode.difficulty;
    case "watch":
      return player === 0 ? mode.light : mode.dark;
    case "online":
      return "human";
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
  /** True when this game was resumed from a saved snapshot. */
  restored: boolean;
  /** ISO timestamp of when the current game began. */
  startedAt: string;
  /** Stable id of the current game (matches MatchResult/archive entries). */
  gameId: string;
  roll(): void;
  movePiece(move: Move): void;
  undo(): void;
  newGame(): void;
  /** Report a live game as abandoned (analytics only; no state change). */
  reportAbandoned(): void;
}

interface Snapshot {
  state: GameState;
  tail: readonly GameEvent[];
}

interface GameMeta {
  gameId: string;
  startedAt: string;
}

function freshMeta(): GameMeta {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `g-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return { gameId: id, startedAt: new Date().toISOString() };
}

export function useGame(mode: GameMode, resume?: SavedGame): UseGameResult {
  const restoredRef = useRef(false);
  const metaRef = useRef<GameMeta | null>(null);
  const sessionRef = useRef<GameSession | null>(null);
  if (sessionRef.current === null) {
    if (resume) {
      // The save was validated before we got here, but storage can rot
      // between reads — fall back to a fresh game rather than crash.
      try {
        sessionRef.current = GameSession.deserialize(resume.session);
        metaRef.current = { gameId: resume.gameId, startedAt: resume.startedAt };
        restoredRef.current = true;
      } catch {
        sessionRef.current = new GameSession({});
      }
    } else {
      sessionRef.current = new GameSession({});
    }
  }
  if (metaRef.current === null) metaRef.current = freshMeta();
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

  // Public actions act only for a HUMAN-controlled seat. The AI driver
  // below bypasses these on purpose (it calls the session directly), so a
  // keyboard shortcut or stray click can never roll/move on the AI's or a
  // watched engine's behalf.
  const humanActsNow = useCallback(() => {
    const current = sessionRef.current!.state;
    return current.winner === null && controllerOf(mode, current.current) === "human";
  }, [mode]);

  const roll = useCallback(() => {
    if (!humanActsNow()) return;
    if (phaseOf(sessionRef.current!.state) !== "awaiting-roll") return;
    // Only human seats reach here (the AI driver calls the session directly),
    // so watch mode never counts as engagement. The once-per-session guard
    // lives in the analytics module.
    trackFirstRoll(analyticsMode(mode));
    commit((session) => session.roll());
  }, [commit, humanActsNow, mode]);

  const movePiece = useCallback(
    (move: Move) => {
      if (!humanActsNow()) return;
      if (phaseOf(sessionRef.current!.state) !== "awaiting-move") return;
      commit((session) => session.move(move));
    },
    [commit, humanActsNow],
  );

  const undo = useCallback(() => {
    if (mode.kind === "watch") return;
    if (sessionRef.current!.state.history.length === 0) return;
    if (mode.kind === "ai") commit((session) => session.undoToPlayerRoll(mode.human));
    else commit((session) => session.undo());
  }, [commit, mode]);

  // Analytics outcome guard — `game_complete` fires at most once per game,
  // whether the game was won or walked away from. Declared before the
  // reporters below so both share it.
  const outcomeRef = useRef<string | null>(null);

  /**
   * Report a started-but-unfinished game as abandoned. Called from the
   * reliable in-app exits (Menu, New game) rather than from
   * `visibilitychange`, which fires on every tab switch and phone lock and
   * would drown the signal. An untouched or already-decided game is not an
   * abandonment, and the shared guard means a win can never also report here.
   */
  const reportAbandoned = useCallback(() => {
    const current = sessionRef.current!.state;
    const meta = metaRef.current!;
    if (current.winner !== null || current.history.length === 0) return;
    if (outcomeRef.current === meta.gameId) return;
    outcomeRef.current = meta.gameId;
    const started = new Date(meta.startedAt).getTime();
    trackGameComplete({
      mode: analyticsMode(mode),
      result: "abandoned",
      difficulty: mode.kind === "ai" ? mode.difficulty : null,
      turns: current.rollCount,
      durationMs: Number.isFinite(started) ? Math.max(0, Date.now() - started) : 0,
    });
  }, [mode]);

  const newGame = useCallback(() => {
    reportAbandoned();
    sessionRef.current = new GameSession({});
    metaRef.current = freshMeta();
    restoredRef.current = false;
    clearGame();
    setSnapshot({ state: sessionRef.current.state, tail: [] });
  }, [reportAbandoned]);

  // One `game_start` per game, fired once the board is live rather than
  // when a mode is picked. A resumed game already reported its start when
  // it began, so restores stay silent instead of double-counting one game.
  const startedRef = useRef<string | null>(null);
  useEffect(() => {
    const meta = metaRef.current!;
    if (startedRef.current === meta.gameId) return;
    startedRef.current = meta.gameId;
    if (restoredRef.current) return;
    trackGameStart({
      mode: analyticsMode(mode),
      // Watch mode has two engines and the property holds one string, so it
      // reports null rather than inventing a combined value.
      difficulty: mode.kind === "ai" ? mode.difficulty : null,
      side: mode.kind === "ai" ? sideOf(mode.human) : null,
    });
  }, [mode, state]);

  // Finished games become a MatchResult (stats) and an archived replay,
  // exactly once per game.
  const recordedRef = useRef<string | null>(null);
  useEffect(() => {
    if (state.winner === null) return;
    const meta = metaRef.current!;
    if (recordedRef.current === meta.gameId) return;
    const result = resultFromGame(state, mode, meta.gameId, meta.startedAt);
    if (result) {
      recordResult(result);
      archiveGame(state, mode, meta.gameId);
      recordedRef.current = meta.gameId;
      if (outcomeRef.current !== meta.gameId) {
        outcomeRef.current = meta.gameId;
        trackGameComplete({
          mode: analyticsMode(mode),
          // Only vs-AI has a single human seat to win or lose; pass-and-play
          // has two and spectate has none, so those report `finished`.
          result:
            mode.kind === "ai" ? (state.winner === mode.human ? "win" : "loss") : "finished",
          difficulty: mode.kind === "ai" ? mode.difficulty : null,
          turns: result.turns,
          durationMs: result.durationMs,
        });
      }
    }
  }, [state, mode]);

  // Auto-save after every state change. An untouched game equals a fresh
  // one, and finished games leave the active slot — both clear the save.
  useEffect(() => {
    if (state.history.length === 0 || state.winner !== null) {
      clearGame();
      return;
    }
    const meta = metaRef.current!;
    saveGame({
      version: CURRENT_SAVE_VERSION,
      savedAt: new Date().toISOString(),
      startedAt: meta.startedAt,
      gameId: meta.gameId,
      mode,
      session: sessionRef.current!.serialize(),
    });
  }, [state, mode]);

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
    // No undo in watch mode, while the AI is thinking, or after the game is
    // decided — rewinding a finished game would contradict the already-
    // recorded result and archived replay.
    canUndo: mode.kind !== "watch" && state.history.length > 0 && !aiTurn && state.winner === null,
    restored: restoredRef.current,
    startedAt: metaRef.current.startedAt,
    gameId: metaRef.current.gameId,
    roll,
    movePiece,
    undo,
    newGame,
    reportAbandoned,
  };
}
