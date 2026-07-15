# Cosmetics Catalog Loop

## Mission
Design the full creative catalog — museum-Mesopotamian luxury — for every locked SKU id, with
palette notes concrete enough that the visual agent implements without invention.

## Subagent assignment
`cosmetics-creative-agent` (consult `ui-ux-agent` for palette coherence if uncertain).

## Parallelism
Wave 1, parallel with Loop 20. No shared files.

## Inputs
CONTRACT locked SKU list + token surface · `globals.css` `:root` values · UI_UX_DESIGN_SYSTEM.

## Files to inspect
`.agent/cosmetics/CONTRACT.md` · `apps/web/app/globals.css` (`:root` block) ·
`docs/UI_UX_DESIGN_SYSTEM.md` (skim).

## Steps
1. For each SKU: name, collection, rarity label, 1-2 sentence lore, price suggestion (USD),
   per-token hex suggestions (only contract-listed tokens), contrast note.
2. Collections: Museum Classics (free) · Royal Treasury · Star Omens (optional) · Excavation
   Finds (achievement stubs).
3. Sanity-check every piece skin: light vs dark remains unmistakable; note the structural
   markers stay.
4. Write `docs/COSMETICS_CATALOG.md` with a summary table + per-SKU entries.

## Checks
Ids match CONTRACT exactly (no renames/additions) · no forbidden aesthetics · token notes only
touch the allowed surface.

## Tests to run
None (docs loop).

## Documentation to update
`docs/COSMETICS_CATALOG.md` (new).

## Git commit format
`docs(cosmetics): creative catalog`

## Done criteria
Every locked SKU designed; visual agent can implement from the doc without follow-up questions.
## Forbidden actions
Production deploy · `git push` · live payment mode · applying migrations to prod · secrets in
git · engine edits. Local commits allowed only when the loop's Done criteria pass.
