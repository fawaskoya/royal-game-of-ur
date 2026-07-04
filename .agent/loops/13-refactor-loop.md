# Refactor Loop

## Mission
Pay down complexity without changing behavior: smaller seams, clearer names, dead code gone —
the codebase stays a joy to extend. Agent: `engineering-agent`.

## Inputs
Friction observed during feature loops (files that resist change); duplication sightings;
performance-agent findings that suggest structure problems.

## Files to inspect
The friction site plus everything that imports it (`grep -rn "from .*<module>" apps packages`);
related tests; relevant ADRs (don't refactor against a recorded decision — supersede it first).

## Steps
1. Write down the *behavioral contract* of the target (inputs → outputs, events, side effects)
   and the test evidence pinning it.
2. If coverage is thin, add characterization tests **before** touching anything.
3. Refactor in small, individually-green steps: extract/rename/inline/move; never mix behavior
   changes into a refactor commit.
4. Respect layer boundaries: rules stay in engine; components stay logic-free; hooks own web
   state (dependency direction: web/cli → ai → engine).
5. Delete dead code and stale comments; update names that lie.
6. Re-run the full automated suite after each step; gameplay smoke at the end.

## Checks
Zero behavior change (same tests green before/after, same bench numbers within noise, same
serialized outputs for same seeds); diff reviewable in one sitting; no new dependencies.

## Tests to run
`pnpm test` after every step · `pnpm typecheck` · `pnpm --filter @ur/web build` · `pnpm bench`
if AI/engine touched · gameplay smoke.

## Documentation to update
ADR if an architectural decision was superseded; `.agent/CHANGELOG.md` (Technical);
`docs/PROJECT_AUDIT.md` if the file map changed.

## Git commit format
`refactor(<pkg>): <what moved/split/renamed>` — body states "no behavior change" + evidence.

## Done criteria
Same behavior, better structure, full suite green, and the original friction demonstrably gone
(the blocked change is now easy).
