# UI Polish Loop

## Mission
One elegant, cohesive, premium product — every screen feels like the same museum-grade game.
Agent: `ui-ux-agent`.

## Inputs
Phase 3 spec in `/MASTER_PROMPT.md`; screenshots of current state; any founder feedback.

## Files to inspect
`apps/web/app/globals.css` (tokens), all of `apps/web/components/`, `docs/UI_UX.md`,
`docs/UI_UX_DESIGN_SYSTEM.md`.

## Steps
1. Screenshot every screen/state first (menu, both orientations, AI thinking, pass toast,
   win overlay, modals) — desktop and phone sizes.
2. Fix one cohesion axis at a time: spacing scale → type hierarchy → button/panel consistency →
   state emphasis (active player, legal targets, capture warnings) → micro-animation timing.
3. All colors/spacing through CSS tokens; extend the token set rather than inlining values.
4. Copy pass: elegant, short, consistent ("Light to play", "Rosette! Take another turn").
5. A11y sweep alongside: focus-visible, aria-labels, contrast, ≥44px touch targets,
   reduced-motion.
6. Re-screenshot and compare before/after.

## Checks
No mismatched button styles; no orphan hardcoded colors (`grep -n "#[0-9a-fA-F]\{3,8\}"
components/`); active player unmistakable at a glance; works on touch and mouse.

## Tests to run
`pnpm --filter @ur/web build` · gameplay regression list · viewport matrix spot check (844×390,
390×844, 1440×900) · contrast checks on changed colors.

## Documentation to update
`docs/UI_UX_DESIGN_SYSTEM.md` (tokens, components, states), `.agent/CHANGELOG.md`.

## Git commit format
`style(web): <area> polish — <one-line summary>`

## Done criteria
Before/after screenshots show clear improvement; a11y sweep passes; no visual regressions in
either orientation.
