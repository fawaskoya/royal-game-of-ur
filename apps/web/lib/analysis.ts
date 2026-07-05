/**
 * Post-game analysis: replay a finished game and grade every real decision
 * with the same expectimax scoring the hint engine uses. A "decision" is a
 * move event where more than one legal move existed — forced moves and
 * passes teach nothing and are skipped.
 *
 * All game facts come from the engine; the only judgement added here is the
 * classification bands and the accuracy curve, both documented below and
 * deliberately heuristic (they grade comfort, not truth).
 */
import {
  applyMove,
  applyRoll,
  createGame,
  legalMoves,
  type GameState,
  type Move,
  type PlayerId,
  type Replay,
} from "@ur/engine";
import { analyzeMoves, type HintTag } from "@ur/ai";

export type MoveClassification = "best" | "good" | "inaccuracy" | "mistake" | "blunder";

export interface MoveGrade {
  /** Index of the move event in `replay.events` (scrub to `eventIndex + 1` to see the result). */
  readonly eventIndex: number;
  /** 1-based turn number (count of rolls so far) — matches the history drawer. */
  readonly turn: number;
  readonly player: PlayerId;
  readonly played: Move;
  readonly best: Move;
  /** Expectimax value lost versus the best move (≤ 0; 0 = played the best move). */
  readonly delta: number;
  readonly classification: MoveClassification;
  /** Why the best move was best (engine-fact tags from the hint engine). */
  readonly bestTags: readonly HintTag[];
}

export interface GameAnalysis {
  readonly grades: readonly MoveGrade[];
  /** Per player: 0–100, or null if that player never faced a real decision. */
  readonly accuracy: readonly [number | null, number | null];
  readonly counts: readonly [Record<MoveClassification, number>, Record<MoveClassification, number>];
  /** Grades worth revisiting (mistakes + blunders), worst first. */
  readonly keyMoments: readonly MoveGrade[];
}

/**
 * Loss bands in evaluation points (progress ≈ 14/square; a capture swings
 * ~60–150). Bands are heuristic and tuned for readability, not ground truth.
 */
export function classify(delta: number): MoveClassification {
  const loss = -delta;
  if (loss <= 1e-6) return "best";
  if (loss <= 10) return "good";
  if (loss <= 30) return "inaccuracy";
  if (loss <= 70) return "mistake";
  return "blunder";
}

/** Mean loss → 0–100 via exponential decay: 0→100, 10→85, 30→61, 70→31. */
export function accuracyFromMeanLoss(meanLoss: number): number {
  return Math.round(100 * Math.exp(-meanLoss / 60));
}

export interface AnalyzeOptions {
  /** Search depth for grading (must match across a comparison). Default 2 = hint depth. */
  readonly depth?: number;
  /** Called after each graded decision — drive progress UI. */
  readonly onProgress?: (done: number, total: number) => void;
  /** Yield to the event loop every N decisions (async variant only). */
  readonly yieldEvery?: number;
}

function emptyCounts(): Record<MoveClassification, number> {
  return { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
}

/** Walk the replay once, yielding a grade at every real decision point. */
function* gradeDecisions(replay: Replay, depth: number): Generator<MoveGrade, void, undefined> {
  let state: GameState = createGame(replay.ruleset);
  let turn = 0;

  for (let i = 0; i < replay.events.length; i++) {
    const event = replay.events[i]!;
    if (event.type === "roll") {
      turn++;
      // applyRoll auto-applies forced passes (ADR 0002) — the matching pass
      // event in the replay is skipped below.
      state = applyRoll(state, { values: event.values, total: event.total });
      continue;
    }
    if (event.type === "pass") continue; // already materialized by applyRoll

    const legal = legalMoves(state);
    if (legal.length > 1) {
      const analyses = analyzeMoves(state, { depth });
      const best = analyses[0]!;
      const played =
        analyses.find(
          (a) => a.move.piece === event.piece && a.move.from === event.from && a.move.to === event.to,
        ) ?? best;
      const delta = played.value - best.value;
      yield {
        eventIndex: i,
        turn,
        player: event.player,
        played: { player: event.player, piece: event.piece, from: event.from, to: event.to },
        best: best.move,
        delta,
        classification: classify(delta),
        bestTags: best.tags,
      };
    }
    state = applyMove(state, { player: event.player, piece: event.piece, from: event.from, to: event.to });
  }
}

function summarize(grades: MoveGrade[]): GameAnalysis {
  const counts: [Record<MoveClassification, number>, Record<MoveClassification, number>] = [
    emptyCounts(),
    emptyCounts(),
  ];
  const losses: [number[], number[]] = [[], []];
  for (const grade of grades) {
    counts[grade.player][grade.classification]++;
    losses[grade.player].push(-grade.delta);
  }
  const accuracy = losses.map((list) =>
    list.length === 0 ? null : accuracyFromMeanLoss(list.reduce((a, b) => a + b, 0) / list.length),
  ) as [number | null, number | null];
  const keyMoments = grades
    .filter((g) => g.classification === "mistake" || g.classification === "blunder")
    .sort((a, b) => a.delta - b.delta);
  return { grades, accuracy, counts, keyMoments };
}

/** Number of decisions that will be graded (for progress bars). */
export function countDecisions(replay: Replay): number {
  let state: GameState = createGame(replay.ruleset);
  let total = 0;
  for (const event of replay.events) {
    if (event.type === "roll") {
      state = applyRoll(state, { values: event.values, total: event.total });
    } else if (event.type === "move") {
      if (legalMoves(state).length > 1) total++;
      state = applyMove(state, { player: event.player, piece: event.piece, from: event.from, to: event.to });
    }
  }
  return total;
}

/** Synchronous analysis — fine for tests and short games. */
export function analyzeGame(replay: Replay, options: AnalyzeOptions = {}): GameAnalysis {
  const depth = options.depth ?? 2;
  const grades: MoveGrade[] = [];
  for (const grade of gradeDecisions(replay, depth)) grades.push(grade);
  return summarize(grades);
}

/** Chunked analysis that yields to the event loop so the UI stays responsive. */
export async function analyzeGameAsync(replay: Replay, options: AnalyzeOptions = {}): Promise<GameAnalysis> {
  const depth = options.depth ?? 2;
  const yieldEvery = options.yieldEvery ?? 8;
  const total = countDecisions(replay);
  const grades: MoveGrade[] = [];
  for (const grade of gradeDecisions(replay, depth)) {
    grades.push(grade);
    options.onProgress?.(grades.length, total);
    if (grades.length % yieldEvery === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return summarize(grades);
}
