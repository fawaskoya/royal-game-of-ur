/**
 * Agents choose among legal moves; they never see or influence the dice.
 * Difficulty comes from decision quality, never from cheating.
 */
import { applyMove, type GameState, type Move, type Rng } from "@ur/engine";
import { DEFAULT_WEIGHTS, MASTER_WEIGHTS, evaluate, type EvalWeights } from "./eval";
import { bestMove } from "./expectimax";

export interface AgentContext {
  /** Randomness source for stochastic agents. Seeded ⇒ reproducible games. */
  readonly rng: Rng;
}

export interface UrAgent {
  readonly id: string;
  readonly name: string;
  /** `moves` is `legalMoves(state)`, guaranteed non-empty. Must return one of them. */
  chooseMove(state: GameState, moves: readonly Move[], context: AgentContext): Move;
}

/** Uniform random over legal moves. Misses captures, rosettes, everything. */
export function randomAgent(): UrAgent {
  return {
    id: "random",
    name: "Random",
    chooseMove(_state, moves, { rng }) {
      return moves[Math.floor(rng.next() * moves.length)]!;
    },
  };
}

/**
 * One-ply greedy: applies each move and keeps the best static evaluation.
 * With `epsilon > 0` it sometimes plays a uniformly random move instead —
 * a human-feeling blunder rate, not a rigged die.
 */
export function greedyAgent(epsilon = 0, weights: EvalWeights = DEFAULT_WEIGHTS): UrAgent {
  return {
    id: epsilon > 0 ? `greedy-e${epsilon}` : "greedy",
    name: epsilon > 0 ? "Greedy (fallible)" : "Greedy",
    chooseMove(state, moves, { rng }) {
      if (epsilon > 0 && rng.next() < epsilon) {
        return moves[Math.floor(rng.next() * moves.length)]!;
      }
      let best = moves[0]!;
      let bestValue = -Infinity;
      for (const move of moves) {
        // Tiny rng jitter breaks ties without affecting real preferences.
        const value = evaluate(applyMove(state, move), state.current, weights) + rng.next() * 1e-6;
        if (value > bestValue) {
          bestValue = value;
          best = move;
        }
      }
      return best;
    },
  };
}

/** Expectimax search agent. Depth counts future rolls. */
export function searchAgent(depth: number, weights: EvalWeights = DEFAULT_WEIGHTS): UrAgent {
  return {
    id: `expectimax-${depth}`,
    name: `Expectimax (depth ${depth})`,
    chooseMove(state, _moves, _context) {
      return bestMove(state, { depth, weights });
    },
  };
}

/**
 * Master: depth-4 expectimax made affordable by beam pruning at inner move
 * layers (top-3 children by static eval; the root is never pruned), plus the
 * rosette-tempo evaluation term. One roll deeper than Expert at comparable
 * think time.
 */
export function masterAgent(weights: EvalWeights = MASTER_WEIGHTS): UrAgent {
  return {
    id: "master",
    name: "Master (beam expectimax, depth 4)",
    chooseMove(state, _moves, _context) {
      return bestMove(state, { depth: 4, beamWidth: 3, weights });
    },
  };
}
