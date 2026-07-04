# Gameplay Experience Loop

## Mission
The game *feels* satisfying: the player always knows what happened and what they can do next.
Agents: `ui-ux-agent` + `engineering-agent`.

## Inputs
Phase 4 spec in `/MASTER_PROMPT.md`; docs/TASKS.md web items (dice animation, capture/victory
sequences); player-feel complaints.

## Files to inspect
`apps/web/lib/useGame.ts` (event tail), `apps/web/components/{Board,DiceTray,GameView}.tsx`,
engine `GameEvent` types, `docs/GAMEPLAY_EXPERIENCE.md`.

## Steps
1. Pick one feel item (dice roll sequence, capture animation, rosette celebration, move
   preview, victory sequence, move history, end-game summary).
2. Source truth from engine events — never infer game facts in the UI layer.
3. Implement with framer-motion within the existing `LayoutGroup`/`MotionConfig` system;
   respect reduced-motion with a meaningful fallback (instant state change + text cue).
4. Move history: render from event-sourced history (`Turn N: Light rolled 3, moved P4 to
   rosette, extra turn`).
5. End-game summary: winner, turns, captures, rosettes from real state — no invented stats.
6. Play at least 2 full games (one vs AI, one PvP) to judge feel, not just correctness.

## Checks
Animations never delay input readiness (can act the moment state allows); pass/capture/rosette
each have a distinct, legible cue; history matches the engine event log exactly.

## Tests to run
`pnpm test` (event consumption unchanged) · `pnpm --filter @ur/web build` · gameplay regression
list · reduced-motion manual pass.

## Documentation to update
`docs/GAMEPLAY_EXPERIENCE.md`, `.agent/CHANGELOG.md`, `docs/TASKS.md` ticks.

## Git commit format
`feat(web): <feel feature>` or `style(web): <animation> tuning`

## Done criteria
The item feels right at normal and reduced motion, in both orientations, with zero rules drift.
