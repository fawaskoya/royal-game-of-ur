# Cosmetics Domain Loop

## Mission
Typed cosmetics module: catalog data, free grants, fail-closed loadout resolution, versioned
localStorage — fully unit-tested, zero UI.

## Subagent assignment
`cosmetics-domain-agent` (mirror `lib/settings.ts` patterns — read it, don't spawn).

## Parallelism
Wave 2, serial gate: needs Loops 20+21 done (ids + pricing labels stable).

## Inputs
CONTRACT · COSMETICS_CATALOG.md · settings.ts storage pattern.

## Files to inspect
`.agent/cosmetics/CONTRACT.md` · `docs/COSMETICS_CATALOG.md` · `apps/web/lib/settings.ts` ·
`apps/web/lib/persistence/gameStorage.ts` (StorageLike).

## Steps
1. `types.ts`: SkuId template-literal types per category, CosmeticSku, CosmeticLoadout,
   Ownership.
2. `catalog.ts`: every SKU with name/collection/price/lockedByDefault from the catalog doc.
3. `freeGrants.ts` + `resolveLoadout.ts` (per-category fail-closed fallback).
4. `storage.ts`: `ur:cosmetics` v1, fail-safe read, `ur:cosmetics-changed` CustomEvent,
   injectable StorageLike.
5. `tokens.ts`: sku -> data-attr value. `entitlementsClient.ts`: interface + offline stub.
6. `index.ts` barrel. Tests: id uniqueness vs CONTRACT, free-default ownership, resolve
   fallback, storage round-trip + junk survival.

## Checks
Pure TS (no React) · no default exports · unknown SKU in storage resolves to defaults.

## Tests to run
`pnpm --filter @ur/web test` · `pnpm --filter @ur/web typecheck`.

## Documentation to update
None (code loop; docs loop covers later).

## Git commit format
`feat(cosmetics): domain module (types, catalog, resolve, storage)`

## Done criteria
Tests green; exports stable; UI/visual agents can build against `lib/cosmetics` without edits.
## Forbidden actions
Production deploy · `git push` · live payment mode · applying migrations to prod · secrets in
git · engine edits. Local commits allowed only when the loop's Done criteria pass.
