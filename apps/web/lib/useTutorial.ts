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
import { trackFirstRoll, trackGameStart } from "@/lib/analytics";

export type TutorialAction =
  | { kind: "next" } // advance on button press
  | { kind: "roll"; total: number } // learner presses Roll → forced total
  | { kind: "move"; from: number } // learner must move the Light piece at `from`
  | { kind: "guideRoll"; total: number } // guide (Dark) rolls; dwells so the value registers before anything moves
  | { kind: "guideMove"; from: number | null }; // guide plays the roll just revealed (null = enters from pool)

export interface TutorialStep {
  readonly coach: string;
  readonly action: TutorialAction;
}

/**
 * Script notes: entering with n lands on path index n. Shared lane is 5–12
 * for both players (same physical squares); 8 is the safe central rosette.
 * Every scripted move is legal by construction — asserted at runtime in dev.
 *
 * Guide (Dark) turns split a roll from its move into two consecutive beats
 * so neither can flash by: `guideRoll` reveals the throw and dwells (see
 * GUIDE_BEAT_MS) before anything moves; the following `guideMove` step then
 * plays the piece using that already-revealed roll. Guide beats state their
 * number as a numeral ("4 —") to make the callout easy to scan at a glance;
 * the learner's own narration keeps spelling numbers out in prose.
 */
export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    coach:
      "Welcome to the Royal Game of Ur — five thousand years old and still sharp. Race all seven of your pieces around the board and home before Dark does.",
    action: { kind: "next" },
  },
  {
    coach:
      "The gold trail is your road: down your four home squares, along the shared middle — the battlefield — then two more and home. Both players travel it in the same shape, mirrored.",
    action: { kind: "next" },
  },
  {
    coach:
      "Four pyramid dice, each a coin-flip worth 0 or 1. Throw them — your total is how far one piece moves.",
    action: { kind: "roll", total: 4 },
  },
  {
    coach: "A four! Tap your glowing pool — the new piece walks four squares up your private lane.",
    action: { kind: "move", from: 0 },
  },
  {
    coach:
      "You landed on a rosette — the flower squares grant another throw. Chain them and you can sprint. Roll again.",
    action: { kind: "roll", total: 2 },
  },
  {
    coach: "Move two squares onto the middle row — the shared lane, where both armies walk the same squares.",
    action: { kind: "move", from: 4 },
  },
  {
    coach: "Dark plays by the same rules. The guide rolls a 4.",
    action: { kind: "guideRoll", total: 4 },
  },
  {
    coach: "4 — a new piece enters and lands right on the rosette.",
    action: { kind: "guideMove", from: null },
  },
  {
    coach: "Rosettes grant another roll… and it's a 3.",
    action: { kind: "guideRoll", total: 3 },
  },
  {
    coach: "3 — the piece steps onto the shared lane, just ahead of yours.",
    action: { kind: "guideMove", from: 4 },
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
    coach: "Captured — Dark starts that journey over. No extra turn for captures — the guide rolls a 1.",
    action: { kind: "guideRoll", total: 1 },
  },
  {
    coach: "1 — a fresh piece enters Dark's private lane.",
    action: { kind: "guideMove", from: null },
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
    coach: "Push your piece four squares down the shared lane toward the exit.",
    action: { kind: "move", from: 8 },
  },
  {
    coach: "Dark rolls a 2 — not a threat to you yet.",
    action: { kind: "guideRoll", total: 2 },
  },
  {
    coach: "2 — the piece creeps forward on Dark's private lane.",
    action: { kind: "guideMove", from: 1 },
  },
  {
    coach:
      "Your piece is deep. Roll a two to step onto your exit lane — the last private stretch before home.",
    action: { kind: "roll", total: 2 },
  },
  {
    coach: "Move two squares onto the exit-lane rosette. One more exact throw and this piece is home.",
    action: { kind: "move", from: 12 },
  },
  {
    coach:
      "Rosette again — another roll. You're one square from home, so only a one will bear this piece off. Roll!",
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
const TUTORIAL_VERSION = 3;

/** Dwell for each guide beat (roll reveal or move) — comfortably over the 1.6s floor so a thrown number always registers before anything moves. */
const GUIDE_BEAT_MS = 1700;

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
    if (action.kind === "roll" || action.kind === "guideRoll") {
      state = applyRoll(state, makeRoll(action.total));
    } else if (action.kind === "guideMove") {
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
  // The scripted game counts as a started game the moment the board is up —
  // there is no lobby or setup step to wait for. Ref-guarded so StrictMode's
  // double-invoked effect reports once.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackGameStart({ mode: "tutorial", difficulty: null, side: "light" });
  }, []);

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
    // Guarded above, so the guide's scripted throws (which run through the
    // guideRoll effect) can never be mistaken for the learner rolling.
    trackFirstRoll("tutorial");
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

  // Guide (Dark) turns: each roll gets its own dwelling beat before anything
  // moves — `guideRoll` reveals the total, and the following `guideMove` step
  // plays it. Both beats keep "Dark is playing…" on continuously.
  useEffect(() => {
    const { action } = step;
    if (action.kind !== "guideRoll" && action.kind !== "guideMove") return;
    setGuideActing(true);
    timerRef.current = setTimeout(() => {
      if (action.kind === "guideRoll") {
        advance(applyRoll(state, makeRoll(action.total)));
        return;
      }
      setGuideActing(false);
      const moves = legalMoves(state);
      const move =
        action.from === null ? moves.find((m) => m.from === 0) : moves.find((m) => m.from === action.from);
      advance(move ? applyMove(state, move) : state);
    }, GUIDE_BEAT_MS);
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
