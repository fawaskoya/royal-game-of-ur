/**
 * Move analysis and hints for human players, built on the same expectimax
 * scoring the agents use — a hint is what a strong tier would play, plus
 * machine-readable reasons the UI can phrase ("lands on a rosette", "captures").
 *
 * Reasons come from engine facts only: the applied move's event flags and the
 * same capture-probability model the evaluator prices danger with.
 */
import {
  applyMove,
  getLayout,
  legalMoves,
  otherPlayer,
  phaseOf,
  rollDistribution,
  type GameState,
  type Move,
  type MoveEvent,
  type PlayerId,
} from "@ur/engine";
import { DEFAULT_WEIGHTS, type EvalWeights } from "./eval";
import { searchValue } from "./expectimax";

export type HintTag =
  | "capture" // takes an opponent piece
  | "rosette" // lands on a rosette: extra turn
  | "finish" // bears the piece off
  | "enter" // develops a new piece from the pool
  | "to-safety" // reaches the protected central rosette
  | "escapes-danger" // leaves a square an opponent could hit next roll
  | "risky"; // ends on a shared square with a real chance of capture

export interface MoveAnalysis {
  readonly move: Move;
  /** Expectimax value from the mover's perspective; higher is better. */
  readonly value: number;
  readonly tags: readonly HintTag[];
}

export interface HintOptions {
  /** Search depth in future rolls. 2 is instant and strong enough to explain. */
  readonly depth?: number;
  readonly weights?: EvalWeights;
}

/** Probability that `player`'s piece at path index `index` is captured next roll. */
function captureChance(state: GameState, player: PlayerId, index: number): number {
  const layout = getLayout(state.ruleset);
  if (!layout.isShared(index)) return 0;
  if (state.ruleset.safeRosettes && layout.isRosette(player, index)) return 0;
  const dist = rollDistribution(state.ruleset.diceCount);
  const opponentAt = new Set(state.positions[otherPlayer(player)]);
  let chance = 0;
  for (let roll = 1; roll < dist.length; roll++) {
    const from = index - roll;
    if (from >= 1 && opponentAt.has(from)) chance += dist[roll]!;
  }
  return chance;
}

function tagsFor(state: GameState, move: Move, child: GameState): HintTag[] {
  const tags: HintTag[] = [];
  const event = child.history[child.history.length - 1] as MoveEvent | undefined;
  const layout = getLayout(state.ruleset);

  if (event?.type === "move") {
    if (event.capture) tags.push("capture");
    if (event.finished) tags.push("finish");
    else if (event.extraTurn) tags.push("rosette");
  }
  if (move.from === 0) tags.push("enter");

  const finished = move.to === layout.finishIndex;
  if (!finished) {
    const safeCentral =
      state.ruleset.safeRosettes && layout.isShared(move.to) && layout.isRosette(move.player, move.to);
    if (safeCentral) tags.push("to-safety");
    if (captureChance(state, move.player, move.from) > 0 && captureChance(child, move.player, move.to) === 0) {
      tags.push("escapes-danger");
    }
    if (captureChance(child, move.player, move.to) >= 0.25) tags.push("risky");
  }
  return tags;
}

/** Score and tag every legal move, best first. Empty unless a move is pending. */
export function analyzeMoves(state: GameState, options: HintOptions = {}): MoveAnalysis[] {
  if (state.winner !== null || phaseOf(state) !== "awaiting-move") return [];
  const depth = options.depth ?? 2;
  const weights = options.weights ?? DEFAULT_WEIGHTS;
  const perspective = state.current;

  return legalMoves(state)
    .map((move) => {
      const child = applyMove(state, move);
      return {
        move,
        value: searchValue(child, depth, perspective, weights),
        tags: tagsFor(state, move, child),
      };
    })
    .sort((a, b) => b.value - a.value);
}

/** The recommended move with its reasons, or null when no move is pending. */
export function hintFor(state: GameState, options: HintOptions = {}): MoveAnalysis | null {
  const analyses = analyzeMoves(state, options);
  return analyses[0] ?? null;
}
