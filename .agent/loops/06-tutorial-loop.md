# Tutorial Loop

## Mission
A newcomer learns the game inside the game: a readable guide (Tutorial Section) plus a guided
interactive first game (Tutorial Mode). Agents: `product-agent` (spec) + `engineering-agent` +
`ui-ux-agent`.

## Inputs
Phase 5 spec in `/MASTER_PROMPT.md`; `docs/GAME_RULES.md` (the only rules truth); strategy
content requirements (beginner/intermediate/advanced).

## Files to inspect
`docs/GAME_RULES.md`, `apps/web/lib/useGame.ts` (mode plumbing), menu component,
`docs/TUTORIAL_AND_STRATEGY.md`, persistence module (tutorial progress storage).

## Steps
1. Tutorial Section first (lower risk): menu-accessible guide — what/objective/board/pieces/
   dice/movement/rosettes/captures/safe squares/extra turns/winning/strategy. Short text;
   diagrams from the real board renderer where possible.
2. Tutorial Mode: a scripted `GameMode` variant — staged steps (roll → select → enter → shared
   lane danger → rosette → capture → bear-off → win) with coach messages, highlighted targets,
   and non-relevant actions disabled per step.
3. Scripted dice via the engine's seeded/injected rolls (dice are inputs — no engine changes
   needed); never fake board state.
4. Next / Skip / Restart controls; progress saved via the persistence module.
5. Strategy guide content checked against actual game math (probabilities of 0–4 rolls:
   1/16, 4/16, 6/16, 4/16, 1/16).

## Checks
Every tutorial claim matches `docs/GAME_RULES.md`; tutorial mode can't reach an unwinnable or
stuck step; skipping mid-way leaves clean state; works in both orientations.

## Tests to run
`pnpm --filter @ur/web build` · full tutorial walkthrough manually (complete + skip paths) ·
gameplay regression list (normal modes untouched).

## Documentation to update
`docs/TUTORIAL_AND_STRATEGY.md`, `.agent/CHANGELOG.md`, backlog ticks.

## Git commit format
`feat(web): tutorial section` / `feat(web): interactive tutorial mode`

## Done criteria
A rules-naive tester can finish the tutorial and then play a real game unaided; progress
persists; no rules drift.
