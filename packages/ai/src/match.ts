/**
 * Headless match runner for benchmarking agents and validating the ladder.
 * Fully deterministic given a seed: dice, agent randomness, and seat
 * alternation all derive from it.
 */
import { createRng, GameSession, type PlayerId, type RulesetConfig } from "@ur/engine";
import type { UrAgent } from "./agents";

export interface GameResult {
  readonly winner: PlayerId;
  readonly rolls: number;
}

/** Play one game between two agents seated as players 0 and 1. */
export function playGame(
  agents: readonly [UrAgent, UrAgent],
  seed: number,
  ruleset?: RulesetConfig,
): GameResult {
  const session = new GameSession({ seed, ruleset });
  const rng = createRng((seed ^ 0x9e3779b9) >>> 0);
  let guard = 0;
  while (session.state.winner === null) {
    if (++guard > 4000) throw new Error("match game did not terminate");
    if (session.phase === "awaiting-roll") {
      session.roll();
      continue;
    }
    const agent = agents[session.state.current];
    session.move(agent.chooseMove(session.state, session.legalMoves(), { rng }));
  }
  return { winner: session.state.winner, rolls: session.state.rollCount };
}

export interface MatchResult {
  readonly games: number;
  /** Wins for agent A and agent B (seats alternate every game). */
  readonly aWins: number;
  readonly bWins: number;
  readonly aWinRate: number;
  readonly averageRolls: number;
}

/** Run a seat-alternating match. Fresh agents per game so none carry state. */
export function runMatch(
  makeA: () => UrAgent,
  makeB: () => UrAgent,
  options: { games: number; seed?: number; ruleset?: RulesetConfig },
): MatchResult {
  const { games, seed = 1, ruleset } = options;
  let aWins = 0;
  let totalRolls = 0;
  for (let i = 0; i < games; i++) {
    const aSeat: PlayerId = (i % 2) as PlayerId;
    const seats: [UrAgent, UrAgent] = aSeat === 0 ? [makeA(), makeB()] : [makeB(), makeA()];
    const result = playGame(seats, seed + i * 7919, ruleset);
    if (result.winner === aSeat) aWins++;
    totalRolls += result.rolls;
  }
  return {
    games,
    aWins,
    bWins: games - aWins,
    aWinRate: aWins / games,
    averageRolls: totalRolls / games,
  };
}
