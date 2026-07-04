# Responsive Fix Loop

## Mission
The game fits every target viewport in both orientations with zero gameplay scrolling and
nothing clipped. Agent: `responsive-layout-agent`.

## Inputs
A reported viewport/orientation failure, or the routine matrix sweep.

## Files to inspect
`apps/web/lib/useGameLayout.ts`, `apps/web/app/globals.css` (`.game-grid`, `.board-frame--fit`,
compaction queries), `apps/web/components/{GameView,Board,PlayerPanel,DiceTray}.tsx`,
`apps/web/public/viewport-lab.html`, ADR 0004, `docs/RESPONSIVE_LAYOUT.md`.

## Steps
1. Reproduce in the viewport lab (`http://localhost:3000/viewport-lab.html`) — confirm the
   OVERFLOW badge or clipped element at the exact size.
2. Diagnose which layer failed: orientation decision (hook) vs board fit (container-query CSS)
   vs chrome compaction (media queries) vs a component's intrinsic minimum size.
3. Fix at that layer. Board sizing stays `min(100cqw, 100cqh × cols/rows, cap)`; chrome
   compacts via `max-height` queries; never introduce scroll, never hardcode a device.
4. Keep DOM order stable across orientations (shared-element animations depend on it).
5. Re-run the **full** matrix (all 8 sizes × applicable orientations), not just the fixed case.
6. Update the doc if strategy/breakpoints changed.

## Checks
FIT badge on all matrix cells; controls usable at 844×390 (smallest landscape) and 390×844
(smallest portrait); toggle + `?layout=` override still work; reduced-motion unaffected.

## Tests to run
`pnpm --filter @ur/web build` · `pnpm typecheck` · full lab matrix · gameplay smoke (roll,
move, AI reply) at 844×390 and 1440×900.

## Documentation to update
`docs/RESPONSIVE_LAYOUT.md` (breakpoints/formula), `.agent/CHANGELOG.md`,
`.agent/KNOWN_ISSUES.md` if a device-specific quirk is accepted.

## Git commit format
`fix(web): <viewport/orientation> layout — <one-line cause>`

## Done criteria
Full matrix green; no regression at any other size; docs match the shipped breakpoints.
