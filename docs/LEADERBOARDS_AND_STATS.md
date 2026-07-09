# Stats & Leaderboards

## Local stats — shipped

Every finished game becomes a `MatchResult`, computed **from the engine event log** at the
moment of victory (`lib/stats/matchResults.ts`, recorded once per game by `useGame`):

```ts
interface MatchResult {
  gameId: string;
  completedAt: string;               // ISO
  mode: GameMode;                    // pvp | ai(human, difficulty) | watch pairing
  winner: PlayerId;
  turns: number;                     // roll count
  durationMs: number;                // from persisted startedAt
  captures: [number, number];        // per player, counted from move events
  rosettes: [number, number];        // extra-turn landings per player
}
```

Stored under `ur:results` (v1), capped at the most recent 200; corrupt entries filtered on
read. Raw results are the source of truth — aggregates are always recomputed, never persisted.

`summarizeStats` (menu → Stats) aggregates **vs-AI games only** (pvp/watch have no single
"you"): games, wins/losses, win rate, current/best streak, average turns, captures made/
suffered, rosettes landed, fastest win, fewest-turn win, and per-difficulty won/played.
Covered by unit tests over real finished engine games (`stats.test.ts`).

## Leaderboards — plan only (no fake data)

Nothing online exists yet; nothing is mocked in the product. When accounts + server arrive
(see `docs/MULTIPLAYER_ARCHITECTURE.md`), `MatchResult` is the submission unit — the server
recomputes/verifies it from the replay before accepting (results are derivable from event
logs by design; client-reported numbers are never trusted).

Planned categories: global rating · weekly/monthly wins · fastest win · best streak · most
captures · AI-challenge score (per-tier bests) · puzzle score (later).

**Rating: Elo first** (K=32 provisional → 16; per-mode pools), upgrade path to Glicko-2 once
volume justifies it (deviation/volatility handle sparse play better). Seasons reset
leaderboards, not ratings.

**Shipped 2026-07-10 — the real server-side ladder (v1)**: `ratings` written exactly once
per finished online game by the Edge Function (status-guarded transition), same constants as
the local module (K=32 provisional <20 games → 16, initial 800); public read via RLS; top-20
Leaderboard panel in the menu; deterministic handles with owner-only rename. Pools, seasons,
and matchmaking remain per the plan below.

**Shipped 2026-07-06 — the Elo math + a local “training rating”**: `lib/rating/elo.ts` (pure,
tested — the same update rule the server will run) and `lib/rating/training.ts`, which folds
the stored vs-AI results into a rating against fixed per-tier anchors (beginner 600 → master
1600). Clearly labeled local/unranked in the Stats panel and shown with a delta on the win
screen. The anchors are deliberate fictions (the ladder is ordered, not calibrated) — a
progress meter, not a claim. Real rankings remain server-side per the plan above.
