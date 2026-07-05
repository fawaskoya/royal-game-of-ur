/**
 * Training rating: derives the local Elo trajectory from stored match
 * results (vs-AI games only, chronological). Nothing is persisted — the
 * results store stays the single source of truth.
 */
import type { MatchResult } from "@/lib/stats/matchResults";
import { INITIAL_RATING, TIER_ANCHORS, ratingTrajectory, type RatingPoint } from "./elo";

export interface TrainingRating {
  readonly current: number;
  /** Rating change from the most recent vs-AI game, or null before any. */
  readonly lastDelta: number | null;
  readonly games: number;
  readonly points: readonly RatingPoint[];
}

export function trainingRating(results: readonly MatchResult[]): TrainingRating {
  const games = results
    .filter((r) => r.mode.kind === "ai")
    .map((r) => {
      const mode = r.mode as Extract<MatchResult["mode"], { kind: "ai" }>;
      return {
        opponent: TIER_ANCHORS[mode.difficulty] ?? INITIAL_RATING,
        won: r.winner === mode.human,
      };
    });
  const { current, points } = ratingTrajectory(games);
  return {
    current,
    lastDelta: points.length > 0 ? points[points.length - 1]!.delta : null,
    games: games.length,
    points,
  };
}
