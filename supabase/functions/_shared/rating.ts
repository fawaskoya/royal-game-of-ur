/**
 * Server-side Elo — the same rule as the client's `apps/web/lib/rating/elo.ts`
 * (kept in sync by construction: expected score 1/(1+10^((b−a)/400)),
 * K=32 while provisional, 16 after PROVISIONAL_GAMES rated games, initial
 * rating 800 — the `ratings` table default). The server is the only writer;
 * the client module only ever derives the local, unranked training rating.
 */
export const INITIAL_RATING = 800;
export const PROVISIONAL_GAMES = 20;
export const K_PROVISIONAL = 32;
export const K_SETTLED = 16;

export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

export function kFor(gamesPlayed: number): number {
  return gamesPlayed < PROVISIONAL_GAMES ? K_PROVISIONAL : K_SETTLED;
}

/** New ratings for (winner, loser) after one decisive game. */
export function applyResult(
  winner: { rating: number; games: number },
  loser: { rating: number; games: number },
): { winner: number; loser: number } {
  const eWinner = expectedScore(winner.rating, loser.rating);
  const eLoser = expectedScore(loser.rating, winner.rating);
  return {
    winner: Math.round(winner.rating + kFor(winner.games) * (1 - eWinner)),
    loser: Math.round(loser.rating + kFor(loser.games) * (0 - eLoser)),
  };
}
