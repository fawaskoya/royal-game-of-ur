"use client";

/**
 * Interactive tutorial: a fully scripted opening sequence on the real engine.
 * Dice are engine inputs, so the script forces exact rolls (applyRoll +
 * makeRoll) — the board, legality, captures, and rosettes are all live engine
 * behavior, never mocked. The learner plays Light; the guide plays Dark.
 *
 * Progress persists under `ur:tutorial` (versioned, fail-safe) so the menu
 * can offer resume; completing or skipping marks it done.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyMove,
  applyRoll,
  createGame,
  legalMoves,
  makeRoll,
  phaseOf,
  type GameState,
  type Move,
} from "@ur/engine";

export type TutorialAction =
  | { kind: "next" } // advance on button press
  | { kind: "roll"; total: number } // learner presses Roll → forced total
  | { kind: "move"; from: number } // learner must move the Light piece at `from`
  | { kind: "auto"; roll: number; from: number | null }; // guide (Dark) plays after a beat

export interface TutorialStep {
  readonly coach: string;
  readonly action: TutorialAction;
}

/**
 * Script notes: entering with n lands on path index n. Shared lane is 5–12
 * for both players (same physical squares); 8 is the safe central rosette.
 * Every scripted move is legal by construction — asserted at runtime in dev.
 */
export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    coach:
      "Welcome to the Royal Game of Ur — five thousand years old and still sharp. Race all seven of your pieces around the board and home before Dark does.",
    action: { kind: "next" },
  },
  {
    coach:
      "Four pyramid dice, each a coin-flip worth 0 or 1. Throw them — your total is how far one piece moves.",
    action: { kind: "roll", total: 4 },
  },
  {
    coach:
      "A four! A new piece enters that many squares up your private lane. Tap your glowing pool to bring one in.",
    action: { kind: "move", from: 0 },
  },
  {
    coach:
      "You landed on a rosette — the flower squares grant another throw. Chain them and you can sprint. Roll again.",
    action: { kind: "roll", total: 2 },
  },
  {
    coach:
      "Now step onto the middle row: the shared lane, where both armies walk the same squares. Move your piece forward.",
    action: { kind: "move", from: 4 },
  },
  {
    coach: "Dark plays by the same rules. Watch — a four enters a piece onto Dark's own rosette…",
    action: { kind: "auto", roll: 4, from: null },
  },
  {
    coach: "…and the extra throw pushes it onto the shared lane, just ahead of yours.",
    action: { kind: "auto", roll: 3, from: 4 },
  },
  {
    coach:
      "On the shared lane, landing on an enemy piece captures it — it goes all the way back to their pool. You're one square behind Dark. Roll.",
    action: { kind: "roll", total: 1 },
  },
  {
    coach: "Take it! Move your piece onto Dark's square.",
    action: { kind: "move", from: 6 },
  },
  {
    coach: "Captured — Dark starts that journey over. No extra turn for captures, so Dark replies…",
    action: { kind: "auto", roll: 1, from: null },
  },
  {
    coach:
      "The central rosette ahead is special: it grants a throw AND no piece can ever be captured there. Claim it.",
    action: { kind: "roll", total: 1 },
  },
  {
    coach: "Tap your piece on the shared lane — it will step onto the central rosette, the safest square on the board.",
    action: { kind: "move", from: 7 },
  },
  {
    coach:
      "Rosette again — extra throw. The shared lane runs to the far end; from there you peel into your private exit lane. Roll a four.",
    action: { kind: "roll", total: 4 },
  },
  {
    coach: "Push your piece down the shared lane toward the exit.",
    action: { kind: "move", from: 8 },
  },
  {
    coach: "Dark inches forward on their private lane — not a threat yet.",
    action: { kind: "auto", roll: 2, from: 1 },
  },
  {
    coach:
      "Your piece is deep. Roll a two to step onto your exit lane — the last private stretch before home.",
    action: { kind: "roll", total: 2 },
  },
  {
    coach: "Move onto the exit-lane rosette. One more exact throw and this piece is home.",
    action: { kind: "move", from: 12 },
  },
  {
    coach:
      "Bearing off needs the exact count — you are one square from home, so only a one will do. Roll!",
    action: { kind: "roll", total: 1 },
  },
  {
    coach: "Exact throw. Tap your piece to bear it off — it leaves the board for good.",
    action: { kind: "move", from: 14 },
  },
  {
    coach:
      "One piece home — six still to race. First to bear off all seven wins. You know enter, rosettes, the shared lane, capture, and exact exits.",
    action: { kind: "next" },
  },
  {
    coach: "Take a real game. Beginner is honest and patient. Good luck — and watch the flowers.",
    action: { kind: "next" },
  },
];

const TUTORIAL_KEY = "ur:tutorial";
/** Bump when the step script changes so mid-progress saves reset cleanly. */
const TUTORIAL_VERSION = 2;

interface TutorialProgress {
  step: number;
  completed: boolean;
}

export function loadTutorialProgress(): TutorialProgress {
  try {
    if (typeof window === "undefined") return { step: 0, completed: false };
    const raw = window.localStorage.getItem(TUTORIAL_KEY);
    if (!raw) return { step: 0, completed: false };
    const parsed = JSON.parse(raw) as { version?: unknown; step?: unknown; completed?: unknown };
    if (parsed.version !== TUTORIAL_VERSION) return { step: 0, completed: false };
    const step = typeof parsed.step === "number" ? Math.min(Math.max(parsed.step, 0), TUTORIAL_STEPS.length - 1) : 0;
    return { step, completed: parsed.completed === true };
  } catch {
    return { step: 0, completed: false };
  }
}

function saveTutorialProgress(progress: TutorialProgress): void {
  try {
    window.localStorage.setItem(TUTORIAL_KEY, JSON.stringify({ version: TUTORIAL_VERSION, ...progress }));
  } catch {
    /* ignore */
  }
}

export interface UseTutorialResult {
  state: GameState;
  stepIndex: number;
  stepCount: number;
  coach: string;
  /** The single move the learner may play right now (filters the board). */
  allowedMoves: readonly Move[];
  canRoll: boolean;
  canNext: boolean;
  waitingForMove: boolean;
  guideActing: boolean;
  finished: boolean;
  roll(): void;
  movePiece(move: Move): void;
  next(): void;
  restart(): void;
  markDone(): void;
}

/**
 * The tutorial replays the scripted actions 0..step to rebuild mid-script
 * state (cheap: a handful of engine calls), so resume after refresh is exact.
 */
function stateAfter(steps: number): GameState {
  let state = createGame();
  for (let i = 0; i < steps; i++) {
    const action = TUTORIAL_STEPS[i]!.action;
    if (action.kind === "roll") {
      state = applyRoll(state, makeRoll(action.total));
    } else if (action.kind === "auto") {
      state = applyRoll(state, makeRoll(action.roll));
      const moves = legalMoves(state);
      const move =
        action.from === null ? moves.find((m) => m.from === 0) : moves.find((m) => m.from === action.from);
      if (move) state = applyMove(state, move);
    } else if (action.kind === "move") {
      const move = legalMoves(state).find((m) => m.from === action.from && m.player === 0);
      if (move) state = applyMove(state, move);
    }
  }
  return state;
}

export function useTutorial(): UseTutorialResult {
  const initial = useMemo(loadTutorialProgress, []);
  const startStep = initial.completed ? 0 : initial.step;
  const [stepIndex, setStepIndex] = useState(startStep);
  const [state, setState] = useState<GameState>(() => stateAfter(startStep));
  const [guideActing, setGuideActing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = TUTORIAL_STEPS[stepIndex]!;
  const finished = stepIndex >= TUTORIAL_STEPS.length - 1;

  const advance = useCallback((nextState: GameState | null) => {
    setStepIndex((index) => {
      const next = Math.min(index + 1, TUTORIAL_STEPS.length - 1);
      saveTutorialProgress({ step: next, completed: next >= TUTORIAL_STEPS.length - 1 });
      return next;
    });
    if (nextState) setState(nextState);
  }, []);

  const roll = useCallback(() => {
    if (step.action.kind !== "roll") return;
    if (phaseOf(state) !== "awaiting-roll") return;
    advance(applyRoll(state, makeRoll(step.action.total)));
  }, [step, state, advance]);

  const movePiece = useCallback(
    (move: Move) => {
      if (step.action.kind !== "move") return;
      if (move.player !== 0 || move.from !== step.action.from) return;
      advance(applyMove(state, move));
    },
    [step, state, advance],
  );

  const next = useCallback(() => {
    if (step.action.kind !== "next") return;
    advance(null);
  }, [step, advance]);

  // Guide (Dark) turns: play the scripted roll+move after a readable beat.
  useEffect(() => {
    if (step.action.kind !== "auto") return;
    const { roll: total, from } = step.action;
    setGuideActing(true);
    timerRef.current = setTimeout(() => {
      setGuideActing(false);
      let nextState = applyRoll(state, makeRoll(total));
      const moves = legalMoves(nextState);
      const move = from === null ? moves.find((m) => m.from === 0) : moves.find((m) => m.from === from);
      if (move) nextState = applyMove(nextState, move);
      advance(nextState);
    }, 1400);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [step, state, advance]);

  const allowedMoves = useMemo(() => {
    if (step.action.kind !== "move") return [];
    const from = step.action.from;
    return legalMoves(state).filter((m) => m.player === 0 && m.from === from);
  }, [step, state]);

  const restart = useCallback(() => {
    saveTutorialProgress({ step: 0, completed: false });
    setStepIndex(0);
    setState(createGame());
  }, []);

  const markDone = useCallback(() => {
    saveTutorialProgress({ step: TUTORIAL_STEPS.length - 1, completed: true });
  }, []);

  return {
    state,
    stepIndex,
    stepCount: TUTORIAL_STEPS.length,
    coach: step.coach,
    allowedMoves,
    canRoll: step.action.kind === "roll",
    canNext: step.action.kind === "next",
    waitingForMove: step.action.kind === "move",
    guideActing,
    finished,
    roll,
    movePiece,
    next,
    restart,
    markDone,
  };
}
