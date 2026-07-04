# Testing Loop

## Mission
Raise and hold the quality bar: suites stay green, fast, and meaningful; manual matrices
actually get run. Agent: `testing-agent`.

## Inputs
`.agent/TEST_PLAN.md`; recent diffs; any bug report or flake.

## Files to inspect
`packages/*/src/**/*.test.ts` (or test dirs), vitest configs, the code under the weakest
coverage (priority: rules > persistence > AI legality > layout utilities).

## Steps
1. Run everything: `pnpm test`, `pnpm typecheck`, `pnpm --filter @ur/web build`; record counts
   and timings.
2. Map recent changes to coverage — find behavior that shipped without a test.
3. Write the missing tests: behavior-level, seeded/deterministic, fast. Bug fixes get a
   regression test named after the bug.
4. Execute the manual lists that apply to recent work (gameplay regression, viewport matrix,
   persistence once it exists).
5. File flakes/gaps as KNOWN_ISSUES or backlog items with reproduction steps.

## Checks
Suite runtime stays reasonable (<30s locally); no skipped tests without a linked issue; new
tests fail when the behavior they guard is broken (verify by inverting once).

## Tests to run
All of them — that's the loop.

## Documentation to update
`.agent/TEST_PLAN.md` (new sections for new subsystems), `.agent/KNOWN_ISSUES.md`,
`.agent/CHANGELOG.md` (Technical).

## Git commit format
`test(<pkg>): <what is now covered>`

## Done criteria
Coverage gap closed with proof; full-suite run recorded; zero silent skips.
