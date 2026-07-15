# Cosmetics Visual Skins Loop

## Mission
Every catalog skin exists as a CSS token pack behind `data-*-skin` attributes, with new
indirection tokens defaulted to today's exact values — unskinned rendering stays pixel-identical.

## Subagent assignment
`cosmetics-visual-agent` (escalate to `responsive-layout-agent` only if fit CSS breaks).

## Parallelism
Wave 3, parallel with Loop 24 (Atelier UI). GameApp.tsx is NOT in this loop's scope.

## Inputs
CONTRACT token surface · catalog palette notes · domain `tokens.ts` attr values.

## Files to inspect
`apps/web/app/globals.css` (board/tile/piece/dice blocks) · `apps/web/components/Board.tsx`
(RosetteGlyph, PieceDisc) · `apps/web/components/DiceTray.tsx` (die faces) ·
`docs/COSMETICS_CATALOG.md`.

## Steps
1. Introduce `--rosette-ink`, `--die-face`, `--die-edge`, `--die-pip` defaults; swap the
   hard-coded uses (RosetteGlyph stroke/fill, die CSS) to the vars.
2. Add a clearly-delimited `/* === COSMETIC SKINS === */` section: one
   `:root[data-...-skin="id"]` block per SKU overriding only allowed tokens.
3. Verify both page themes under each skin (skins sit on top of theme like data-theme does).
4. Contrast pass per piece skin (markers intact, halo/hint/capture visible).

## Checks
No page-chrome token overridden in any skin · no layout/fit CSS touched · defaults block
produces zero visual diff.

## Tests to run
`pnpm --filter @ur/web typecheck` · viewport lab 12-cell matrix (layout unchanged) · manual
skin sweep on dev with devtools attribute toggling.

## Documentation to update
None here.

## Git commit format
`feat(cosmetics): skin token packs + indirection tokens`

## Done criteria
Toggling attributes in devtools restyles board/dice/pieces per catalog; no regressions
unskinned.
## Forbidden actions
Production deploy · `git push` · live payment mode · applying migrations to prod · secrets in
git · engine edits. Local commits allowed only when the loop's Done criteria pass.
