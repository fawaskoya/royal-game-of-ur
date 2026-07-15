# Cosmetics Test & Regression Loop

## Mission
Prove the sprint: automated tests green, manual checklist executed, safety attestation
recorded (no prod, no push, no live mode, no secrets).

## Subagent assignment
`testing-agent` + `security-agent` (safety attestation half).

## Parallelism
Wave 5, after Loop 28. Docs loop (30) may run parallel to this.

## Inputs
Full working tree · CONTRACT acceptance list · mega-prompt acceptance criteria.

## Files to inspect
`lib/cosmetics/*.test.ts` · changed components list from WAVE_LOG · `git status`.

## Steps
1. Run `pnpm test` (all workspaces) + `pnpm typecheck`; record results.
2. Manual matrix: Atelier at 390px/desktop · each skin category swap · both page themes ·
   piece contrast + hint/capture visibility per piece skin · online room smoke (local wire) ·
   donate panel opens · replay viewer renders under a skin.
3. Security: grep tree for key-like strings in staged files; confirm `DODO_PAYMENTS_MODE`
   never `live`; confirm no `vercel --prod`/push in any script added; migrations unapplied.
4. Write attestation block into WAVE_LOG.

## Checks
Every acceptance checkbox in the mega-prompt gets a pass/fail/n-a mark — no silent skips.

## Tests to run
`pnpm test` · `pnpm typecheck` · viewport matrix if visual loop touched anything layout-near.

## Documentation to update
`.agent/cosmetics/WAVE_LOG.md` attestation.

## Git commit format
`test(cosmetics): regression + safety attestation`

## Done criteria
Attestation present; failures triaged into TASK_BOARD as blocked/todo items.
## Forbidden actions
Production deploy · `git push` · live payment mode · applying migrations to prod · secrets in
git · engine edits. Local commits allowed only when the loop's Done criteria pass.
