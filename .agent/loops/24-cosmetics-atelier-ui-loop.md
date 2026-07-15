# Cosmetics Atelier UI Loop

## Mission
The Atelier: a menu-reachable panel with Boards | Dice | Pieces | Flair tabs, live preview,
equip for owned, locked+price for unowned — in the existing design language, mobile-safe.

## Subagent assignment
`cosmetics-atelier-ui-agent` (consult `ui-ux-agent` for spacing/pattern questions).

## Parallelism
Wave 3, parallel with Loop 23. Owns the GameApp menu button; visual agent must not touch
GameApp.

## Inputs
Domain exports (`lib/cosmetics`) · CONTRACT UI naming · existing panel patterns.

## Files to inspect
`apps/web/lib/cosmetics/index.ts` · `components/ui/Modal.tsx` · `SettingsPanel.tsx` ·
`LeaderboardPanel.tsx` · `GameApp.tsx` (secondaryLinks + panels blocks only).

## Steps
1. `AtelierPanel.tsx`: tabs, card grid (name, collection, rarity, price/owned badge), equip
   action -> domain storage; equipped state ring; locked overlay with price.
2. Preview: minimum = swatch row of the SKU's tokens; better = small static board mock using
   the same CSS vars scoped to the card (no live Board instance per card).
3. Menu: `Atelier` button beside Settings (both compact + desktop link rows) + panel mount.
4. 390px pass: tabs scroll/wrap cleanly, cards stack, no viewport overflow.

## Checks
No catalog/ownership duplication (domain is the source) · modal a11y matches existing panels ·
free user sees all four categories usable immediately.

## Tests to run
`pnpm --filter @ur/web typecheck` · manual: open/equip/lock states on dev at 390px + desktop.

## Documentation to update
None here.

## Git commit format
`feat(cosmetics): Atelier panel + menu entry`

## Done criteria
Equip an owned skin from the UI and the stored loadout changes (visible once CosmeticsEffect
lands in Wave 5); locked skins clearly gated.
## Forbidden actions
Production deploy · `git push` · live payment mode · applying migrations to prod · secrets in
git · engine edits. Local commits allowed only when the loop's Done criteria pass.
