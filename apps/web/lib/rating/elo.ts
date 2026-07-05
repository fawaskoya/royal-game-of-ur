/**
 * Elo rating math — pure and dependency-free, the same update rule a future
 * ranked server will run (see docs/LEADERBOARDS_AND_STATS.md).
 *
 * Locally it powers the **training rating**: an unranked, this-device-only
 * number derived from your games against the AI tiers, each tier pinned to a
 * fixed anchor rating. Anchors are deliberate fictions (the ladder is only
 * ordered, not calibrated) — the number is a progress meter, not a claim.
 */
export const K_PROVISIONAL = 32;
export const K_ESTABLISHED = 16;
/** Games before the K-factor settles. */
export const PROVISIONAL_GAMES = 20;
export const INITIAL_RATING = 800;

/** Fixed anchor ratings for the AI tiers (local fiction; see module note). */
export const TIER_ANCHORS: Record<string, number> = {
  beginner: 600,
  easy: 800,
  medium: 1000,
  hard: 1200,
  expert: 1400,
  master: 1600,
};

/** Standard Elo expected score for `rating` vs `opponent`. */
export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

/** One Elo update. `score` is 1 for a win, 0 for a loss (Ur has no draws). */
export function updateRating(rating: number, opponent: number, score: 0 | 1, gamesPlayed: number): number {
  const k = gamesPlayed < PROVISIONAL_GAMES ? K_PROVISIONAL : K_ESTABLISHED;
  return Math.round(rating + k * (score - expectedScore(rating, opponent)));
}

export interface RatingPoint {
  readonly rating: number;
  readonly delta: number;
}

/**
 * Fold a chronological win/loss sequence against known opponents into a
 * rating trajectory. Derived on read — the raw results are the store.
 */
export function ratingTrajectory(
  games: readonly { opponent: number; won: boolean }[],
): { current: number; points: RatingPoint[] } {
  let rating = INITIAL_RATING;
  const points: RatingPoint[] = [];
  games.forEach((game, index) => {
    const next = updateRating(rating, game.opponent, game.won ? 1 : 0, index);
    points.push({ rating: next, delta: next - rating });
    rating = next;
  });
  return { current: rating, points };
}
