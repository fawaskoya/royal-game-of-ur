# Cosmetics Flair Loop

## Mission
Flair renders on identity surfaces — offline free flair immediately, shared flair online per
the entitlements decision — with zero layout damage on tight rows.

## Subagent assignment
`cosmetics-flair-agent`.

## Parallelism
Wave 4, parallel with Loops 25 + 26. Waits only on domain exports (Wave 2).

## Inputs
Domain flair API · entitlements flair-sharing decision (stub acceptable if 25 unfinished).

## Files to inspect
`components/AuthPanel.tsx` · `components/OnlineRoomView.tsx` (identity line) ·
`components/RoomGameScreen.tsx` (header) · `components/LeaderboardPanel.tsx` ·
`lib/cosmetics/index.ts`.

## Steps
1. `Flair.tsx`: tiny presentational renderer keyed by flair id (glyph/frame accent, CSS-only).
2. Wire into the four surfaces behind "has flair" guards; `flair.none` renders nothing.
3. Online sharing: consume whatever 25 shipped (profiles column preferred); otherwise render
   own flair locally + document the gap.

## Checks
No new network calls per leaderboard row · row heights unchanged · anonymous/offline users
unaffected.

## Tests to run
`pnpm --filter @ur/web typecheck` · manual: lobby + leaderboard with flair equipped/none.

## Documentation to update
Notes to docs loop.

## Git commit format
`feat(cosmetics): profile flair rendering`

## Done criteria
Equipping a flair shows it on identity surfaces on dev; none = today's exact rendering.
## Forbidden actions
Production deploy · `git push` · live payment mode · applying migrations to prod · secrets in
git · engine edits. Local commits allowed only when the loop's Done criteria pass.
