# Cosmetics Docs Loop

## Mission
A human can understand and run everything: Atelier usage, env var names, dev-grant how-to,
what needs Dodo dashboard work — plus changelog/README sync.

## Subagent assignment
`docs-agent`.

## Parallelism
Wave 5, parallel with Loop 29 once 28 is stable.

## Inputs
All cosmetics docs drafts · WAVE_LOG · CHANGELOG conventions (root + .agent).

## Files to inspect
`docs/COSMETICS_AND_COMMERCE.md` · `docs/COSMETICS_CATALOG.md` · `docs/MONETIZATION.md` ·
`CHANGELOG.md` · `.agent/CHANGELOG.md` · `README.md` (status table).

## Steps
1. Finalize both cosmetics docs (fill gaps handed off by loops 25-28).
2. `MONETIZATION.md`: status -> Atelier shipped on dev; next = Dodo products + prod unlock
   phrase.
3. Root `CHANGELOG.md` Unreleased + `.agent/CHANGELOG.md` engineering entry.
4. README status row: Atelier (dev) present.
5. How-to-run section: `pnpm dev` -> menu -> Atelier; env names only; dev-grant instructions.

## Checks
No secrets/values · no claim of production availability · consistent SKU names with CONTRACT.

## Tests to run
None.

## Documentation to update
As above.

## Git commit format
`docs(cosmetics): atelier + commerce docs, changelog`

## Done criteria
Fresh reader can run the Atelier and knows exactly which steps remain human-only.

## Forbidden actions
Production deploy · `git push` · live payment mode · applying migrations to prod · secrets in
git · engine edits. Local commits allowed only when the loop's Done criteria pass.
