# Regression Loop

## Mission
Catch breakage the moment it lands: a periodic full sweep of automated + manual checks against
the current tree, independent of any feature work. Agent: `testing-agent`.

## Inputs
Current `HEAD`; the last regression report (compare against it).

## Files to inspect
None specifically — this loop exercises the *product*, not the code. Read
`.agent/TEST_PLAN.md` for the current checklists.

## Steps
1. Automated sweep: `pnpm test` → `pnpm typecheck` → `pnpm --filter @ur/web build` →
   `pnpm bench` (ladder still monotonic) → `pnpm demo` (CLI end-to-end sanity).
2. Manual gameplay regression list (TEST_PLAN): full game vs AI, PvP sanity, rosette, capture,
   pass, undo, win overlay, keyboard, screen-reader live region.
3. Viewport matrix sweep in the lab — all 8 sizes, both orientations where applicable.
4. Persistence sweep (once shipped): refresh mid-game, corrupt-save injection, New Game modal.
5. Console check at every step: zero errors/warnings tolerated without a filed issue.
6. Compare results to the previous regression report; investigate every delta to a root cause
   (bisect if needed).

## Checks
Every list fully executed — no "spot check" shortcuts in this loop; deltas explained, not
shrugged off.

## Tests to run
All automated suites + all manual lists (see Steps).

## Documentation to update
`.agent/KNOWN_ISSUES.md` (new findings with reproduction steps), `.agent/CHANGELOG.md` if
fixes ship, dated regression summary in the loop report.

## Git commit format
Fixes found here: `fix(<pkg>): <bug> (caught by regression sweep)`

## Done criteria
Full sweep executed and recorded; every failure either fixed or filed with reproduction steps;
report compares cleanly to the previous run.
