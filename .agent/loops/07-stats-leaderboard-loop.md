# Stats & Leaderboard Loop

## Mission
Coherent local statistics now; clean schemas that online leaderboards can adopt later without
migration pain. Agent: `engineering-agent` (+ `product-agent` for what to show).

## Inputs
Phase 8 spec in `/MASTER_PROMPT.md` (local stat list, `MatchResult` schema, Elo-first plan);
persistence module.

## Files to inspect
`apps/web/lib/persistence/**`, `apps/web/lib/useGame.ts` (game-end detection),
`docs/LEADERBOARDS_AND_STATS.md`, engine event history (source of truth for counts).

## Steps
1. Implement `MatchResult` (gameId, completedAt, mode, winner/loser, turns, durationMs,
   captures, rosettes, difficulty) — computed from the engine event log at game end, stored via
   the persistence module (versioned).
2. Derive local aggregates on read (games, wins/losses, win rate, streaks, captures, rosettes,
   fastest/fewest-turn wins, per-difficulty records) — store raw results, compute summaries;
   don't persist derivable numbers.
3. Stats UI: gameplay shows only live-relevant stats; the full dashboard lives in a Stats panel.
4. Leaderboard prep is **docs + types only** (categories, Elo plan) — no fake production data;
   any mock clearly marked dev-only.

## Checks
Counts reconcile against a hand-checked game's event log; stats survive refresh; a corrupt
results store fails closed without nuking gameplay saves (separate keys).

## Tests to run
Unit tests for result computation from event history · persistence round-trip · `pnpm test` ·
web build.

## Documentation to update
`docs/LEADERBOARDS_AND_STATS.md` (schema, categories, Elo plan), `.agent/CHANGELOG.md`.

## Git commit format
`feat(web): local match results + stats` / `docs: leaderboard architecture plan`

## Done criteria
Finish 3 games → stats panel shows verifiably correct numbers; schemas documented; zero fake
data unmarked.
