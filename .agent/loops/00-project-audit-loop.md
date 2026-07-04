# Project Audit Loop

## Mission
Produce/refresh an accurate snapshot of the codebase so every other loop starts from truth, not
assumption.

## Inputs
Current repo state; `.agent/MASTER_PROMPT.md` phase table; operator concerns if any.

## Files to inspect
`package.json` (root + all workspaces), `pnpm-workspace.yaml`, `CLAUDE.md`, `docs/*.md`,
`docs/adr/*`, `apps/web/{app,components,lib}/**`, `packages/{engine,ai}/src` entry points,
`.github/workflows/**`, `git log --oneline -15`, `git status`, `git remote -v`.

## Steps
1. Map the workspace: packages, dependency direction, scripts (never invent commands).
2. Identify framework versions, styling system, state approach, routing, storage.
3. Locate: main game component, board renderer, orientation logic, rules engine, AI engine,
   persistence (or its absence).
4. Diff reality against `docs/PROJECT_AUDIT.md` and the `.agent/MASTER_PROMPT.md` phase table.
5. List risk areas (untested seams, drift, stale docs, uncommitted work).
6. Rewrite `docs/PROJECT_AUDIT.md` with: architecture summary, issues discovered, main files,
   risk areas, recommended implementation order.

## Checks
Every claim verified by reading the file it describes; no aspirational statements; risk areas
have concrete file references.

## Tests to run
`pnpm test && pnpm typecheck` (baseline health snapshot recorded in the audit).

## Documentation to update
`docs/PROJECT_AUDIT.md`, `.agent/KNOWN_ISSUES.md` (new discoveries), `.agent/MASTER_PROMPT.md`
phase table if drifted.

## Git commit format
`docs: refresh project audit (YYYY-MM-DD)`

## Done criteria
Audit reflects the working tree exactly; baseline test results recorded; backlog updated with
any newly discovered work.
