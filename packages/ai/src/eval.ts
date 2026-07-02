/**
 * Static position evaluation.
 *
 * Scores a position from one player's perspective as (my side − their side),
 * where each side counts: borne-off pieces, path progress, control of the
 * safe central rosette, and expected loss from capturable pieces on the
 * shared lane (weighted by the binomial probability that some opposing piece
 * lands on them next throw).
 */
import {
  getLayout,
  otherPlayer,
  rollDistribution,
  type GameState,
  type PlayerId,
} from "@ur/engine";

export interface EvalWeights {
  /** Value of a borne-off piece. */
  readonly finished: number;
  /** Value per path square of progress. */
  readonly progress: number;
  /** Bonus for occupying a shared-lane rosette (safe + forward outpost). */
  readonly centralRosette: number;
  /** Multiplier on expected capture loss. */
  readonly danger: number;
}

export const DEFAULT_WEIGHTS: EvalWeights = {
  finished: 320,
  progress: 14,
  centralRosette: 28,
  danger: 1.0,
};

/** Score used for decided games; margins shrink with game length to prefer fast wins. */
export const WIN_SCORE = 1_000_000;

export function evaluate(state: GameState, perspective: PlayerId, weights: EvalWeights = DEFAULT_WEIGHTS): number {
  if (state.winner !== null) {
    return state.winner === perspective ? WIN_SCORE - state.rollCount : -WIN_SCORE + state.rollCount;
  }
  return sideScore(state, perspective, weights) - sideScore(state, otherPlayer(perspective), weights);
}

function sideScore(state: GameState, player: PlayerId, w: EvalWeights): number {
  const layout = getLayout(state.ruleset);
  const opponent = otherPlayer(player);
  const dist = rollDistribution(state.ruleset.diceCount);
  const opponentAt = new Set(state.positions[opponent]);
  let score = 0;

  for (const index of state.positions[player]) {
    if (index === layout.finishIndex) {
      score += w.finished;
      continue;
    }
    score += index * w.progress;
    if (index === 0) continue;

    const onSafeRosette = state.ruleset.safeRosettes && layout.isRosette(player, index);
    if (layout.isShared(index) && layout.isRosette(player, index)) score += w.centralRosette;

    // Expected loss to capture: shared-lane squares only, and never on a safe rosette.
    if (layout.isShared(index) && !onSafeRosette) {
      let hitProbability = 0;
      for (let roll = 1; roll < dist.length; roll++) {
        const from = index - roll;
        if (from >= 1 && opponentAt.has(from)) hitProbability += dist[roll]!;
      }
      score -= hitProbability * (index * w.progress + 40) * w.danger;
    }
  }
  return score;
}
