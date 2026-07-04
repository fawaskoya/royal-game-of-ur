# Persistence Loop

## Mission
Games survive refresh/close exactly; saves are versioned, validated, and migration-ready.
Agent: `persistence-agent` (+ `security-agent` review).

## Inputs
Phase 2 spec in `/MASTER_PROMPT.md`; engine serialization API; current `useGame` lifecycle.

## Files to inspect
`apps/web/lib/useGame.ts`, engine `serialization` exports (`ur-state@1` format),
`apps/web/lib/persistence/**` (once created), `docs/PERSISTENCE.md`, CLAUDE.md rule 4.

## Steps
1. Design/confirm the `SavedGame` schema: `version`, `savedAt`, `gameId`, `mode`, `ruleset`,
   `orientationPreference`, `state` (engine-serialized), `history`, `stats`, `ai` config.
2. Implement the module: `gameStorage.ts` (save/load/clear/has), `saveSchema.ts`,
   `migrations.ts`, `usePersistedGame.ts`. Everything behind try/catch; storage failure →
   in-memory play, never a crash.
3. Auto-save on every meaningful state change (immediate after moves; debounce only if
   measurement shows need).
4. Restore on load: validate → (migrate) → engine-verify via replay → hydrate. Invalid → clean
   start, save discarded, optional toast.
5. New Game UX: live save exists → confirmation modal ("Your current game will be replaced");
   none → start directly.
6. Persist orientation preference and future settings under separate keys.

## Checks
Restore lands on an actionable phase (never mid-AI-limbo); player order, dice, and history
identical after refresh; corrupt payloads (truncated JSON, wrong version, tampered moves) fail
closed.

## Tests to run
Unit: schema validation, migration paths, corrupt-input fuzzing. Manual: TEST_PLAN persistence
list. Plus `pnpm test`, `pnpm --filter @ur/web build`.

## Documentation to update
`docs/PERSISTENCE.md` (schema, flow, failure modes), `.agent/CHANGELOG.md`, backlogs,
KNOWN_ISSUES AG-2/AG-3 → Resolved.

## Git commit format
`feat(web): persist game state across reloads (versioned save schema)`

## Done criteria
All persistence acceptance criteria from the founding prompt pass; security review of the
validation path done; docs complete.
