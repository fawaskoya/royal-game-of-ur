/**
 * Expectimax search: alternating max/min move layers (us/them) separated by
 * chance layers for the dice, weighted by the exact binomial distribution.
 * Rosette extra-turns fall out naturally because the engine keeps `current`
 * on the mover — the search just asks whose turn each node is.
 *
 * Depth counts chance layers (rolls). Branching is ≤ 5 rolls × ≤ 7 moves, so
 * depth 2 ≈ 1e3 and depth 3 ≈ 4e4 engine calls — instant in practice.
 */
import {
  applyMove,
  applyRoll,
  legalMoves,
  makeRoll,
  phaseOf,
  rollDistribution,
  type GameState,
  type Move,
  type PlayerId,
} from "@ur/engine";
import { DEFAULT_WEIGHTS, evaluate, type EvalWeights, WIN_SCORE } from "./eval";

export interface SearchOptions {
  /** Number of future rolls to consider. */
  readonly depth: number;
  readonly weights?: EvalWeights;
}

/** Value of a state (any phase) from `perspective`, searching `depth` rolls ahead. */
export function searchValue(
  state: GameState,
  depth: number,
  perspective: PlayerId,
  weights: EvalWeights = DEFAULT_WEIGHTS,
): number {
  if (state.winner !== null) {
    return state.winner === perspective ? WIN_SCORE - state.rollCount : -WIN_SCORE + state.rollCount;
  }
  if (depth <= 0) return evaluate(state, perspective, weights);

  if (phaseOf(state) === "awaiting-move") {
    return moveLayerValue(state, depth, perspective, weights);
  }

  // Chance layer: expectation over the next roll.
  const dist = rollDistribution(state.ruleset.diceCount);
  let expected = 0;
  for (let total = 0; total < dist.length; total++) {
    const afterRoll = applyRoll(state, makeRoll(total, state.ruleset.diceCount));
    const value =
      phaseOf(afterRoll) === "awaiting-move"
        ? moveLayerValue(afterRoll, depth, perspective, weights)
        : searchValue(afterRoll, depth - 1, perspective, weights); // forced pass or game over
    expected += dist[total]! * value;
  }
  return expected;
}

function moveLayerValue(state: GameState, depth: number, perspective: PlayerId, weights: EvalWeights): number {
  const moves = legalMoves(state);
  const maximizing = state.current === perspective;
  let best = maximizing ? -Infinity : Infinity;
  for (const move of moves) {
    const child = applyMove(state, move);
    const value = searchValue(child, depth - 1, perspective, weights);
    best = maximizing ? Math.max(best, value) : Math.min(best, value);
  }
  return best;
}

/** The highest-expected-value legal move for the current player. */
export function bestMove(state: GameState, options: SearchOptions): Move {
  const moves = legalMoves(state);
  if (moves.length === 0) throw new Error("bestMove called with no legal moves");
  if (moves.length === 1) return moves[0]!;

  const weights = options.weights ?? DEFAULT_WEIGHTS;
  const perspective = state.current;
  let best = moves[0]!;
  let bestValue = -Infinity;
  for (const move of moves) {
    const value = searchValue(applyMove(state, move), options.depth, perspective, weights);
    if (value > bestValue) {
      bestValue = value;
      best = move;
    }
  }
  return best;
}
