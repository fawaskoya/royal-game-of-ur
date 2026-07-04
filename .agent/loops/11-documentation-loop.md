# Documentation Loop

## Mission
Docs tell the truth — a newcomer (or a fresh agent) can reconstruct project state from
`docs/` + `.agent/` alone. Agent: `docs-agent`.

## Inputs
Recent commits since the last doc pass; operator confusion reports; phase completions.

## Files to inspect
`git log --oneline` since last doc commit, all of `docs/*.md`, `.agent/*.md`, `README.md`,
`CLAUDE.md`, ADR index.

## Steps
1. Diff docs against reality: phase tables, backlog states, commands, file paths, feature
   claims — verify each against the working tree.
2. Fix drift in place; supersede (don't delete) outdated decisions.
3. Ensure the paper trail per phase exists: phase doc + CHANGELOG entry + backlog tick +
   KNOWN_ISSUES movement.
4. De-duplicate: one source of truth per fact, links elsewhere (`.agent/ROADMAP.md` ↔
   `docs/ROADMAP.md`; rules live in CLAUDE.md/GAME_RULES.md only).
5. Check ADR coverage: any architectural change since last pass without an ADR → write it
   (format: `docs/adr/000N-title.md`, matching existing style).

## Checks
No aspirational claims; no dead links/paths; command snippets actually run; `.agent/` and
`docs/` backlogs agree.

## Tests to run
Spot-execute documented commands (`pnpm test`, lab URL, etc.) to confirm they work as written.

## Documentation to update
Everything found stale — that's the loop. Always: `.agent/CHANGELOG.md` (Documentation).

## Git commit format
`docs: <scope> sync (YYYY-MM-DD)`

## Done criteria
Random-sample audit (pick 5 claims, verify each) passes; phase table current; zero known drift.
