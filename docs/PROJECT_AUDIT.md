# Project Audit — 2026-07-04

Phase 0 snapshot for the improvement campaign (`/MASTER_PROMPT.md`). Baseline health at audit
time: **engine 48/48 tests, ai 14/14 tests, typecheck green in all four packages.**

## Architecture summary

pnpm workspace monorepo, strict TypeScript, ESM, Node ≥20, pnpm 10.17.1.
Dependency direction (enforced by convention + review): `apps/web`, `apps/cli` → `@ur/ai` →
`@ur/engine`.

| Package | Purpose | Key facts |
|---|---|---|
| `packages/engine` (`@ur/engine`) | **Only** home of gameplay rules. | Pure functions over immutable `GameState`; dice as inputs (`applyRoll`); event-sourced history with re-validating replay (`buildStateFromEvents` — future anti-cheat); versioned serialization `ur-state@1`/`ur-replay@1`; seeded RNG; zero runtime deps. Tests incl. 120-game fuzz. |
| `packages/ai` (`@ur/ai`) | AI opponents. | Eval + expectimax; 5-tier honest ladder (beginner/easy/medium/hard/expert), monotonic by bench; seeded match runner; agents see `legalMoves(state)` only. |
| `apps/cli` (`@ur/cli`) | Proof client. | `pnpm demo` (narrated game), `sim`, `bench`. |
| `apps/web` (`@ur/web`) | Next.js 15 (App Router) client. | React 19, Tailwind CSS v4 (via `@tailwindcss/postcss`), framer-motion 12. No test runner of its own. |

### Web client structure

- **Framework/build**: Next.js `^15.3` (15.5.20 installed), `next dev` on :3000, `next build`.
- **Styling**: Tailwind v4 utilities + design tokens as CSS custom properties in
  `apps/web/app/globals.css` (`--gold`, `--bg-raised`, `--ink-dim`, `--frame-edge`, tile/piece
  classes, `.game-grid` layout areas).
- **State**: no external store. `apps/web/lib/useGame.ts` wraps the engine `GameSession` and is
  the single place web game logic lives; components render + forward input only.
- **Routing**: single page (`app/page.tsx` menu ↔ `GameView`); no extra routes.
- **Main components**: `components/GameView.tsx` (screen shell, header, grid, win overlay,
  aria-live narration), `components/Board.tsx` (grid renderer + `orientation` prop transpose),
  `components/PlayerPanel.tsx`, `components/DiceTray.tsx`, `components/Menu*` (mode select).
- **Orientation logic**: `apps/web/lib/useGameLayout.ts` — touch devices
  (`hover:none & pointer:coarse`) follow OS orientation; desktop gets a header toggle persisted
  as `ur-layout` in localStorage; `?layout=` test override.
- **Persistence**: **none** for game state (localStorage holds only the layout preference).
  Refresh loses the game — top backlog item (Phase 2).

### Tooling & CI

- Scripts: `pnpm test | typecheck | build | demo | sim | bench | dev`. **No lint script** —
  do not invent one (KNOWN_ISSUES AG-4).
- CI: `.github/workflows/` runs package tests; web `next build` job planned once a remote
  exists (docs/TASKS.md infra).
- Git: branch `fix/responsive-persistence-ux` (campaign branch off `main`). **No remote
  configured** — commits are local-only until the founder picks an account (AG-1).

## Current issues discovered

1. **Responsive fit** (Phase 1, this campaign): pre-campaign horizontal mode overflowed the
   viewport (board rendered at natural tile size); vertical mode overflowed mobile portrait
   (3 aspect-square columns of a 768px-max container ⇒ ~975px board on a 390px phone). Chrome
   (header/panels/dice) had no compaction for short viewports; horizontal sidebar was fixed at
   21rem (oversized for phone landscape).
2. **No game persistence** — refresh resets to menu/new game (Phase 2).
3. **No New Game confirmation** — one tap discards a live game (with Phase 2).
4. **Stats are minimal** — home counts only; no captures/turns/history surfaced (Phases 3–4, 8).
5. **No tutorial** (Phase 5). AI ladder is 5 tiers vs the target 6 named tiers (Phase 6).
6. **Uncommitted work at audit time**: orientation system + dice-tray restyle + horizontal fit
   (this session's Phase 1 folds it in and commits it).
7. Dev-environment footgun (resolved): a stale `next start` production server from 07-02 was
   still serving :3000, masking live edits.

## Main files involved in this campaign

```
apps/web/lib/useGameLayout.ts        orientation decision (+ test override)
apps/web/app/globals.css             tokens, .game-grid, .board-frame--fit, compaction queries
apps/web/components/GameView.tsx     screen shell (h-dvh, header, grid wiring)
apps/web/components/Board.tsx        board renderer (orientation transpose, fit frame)
apps/web/components/PlayerPanel.tsx  player cards (compaction, future stats)
apps/web/components/DiceTray.tsx     dice row (compaction, future roll animation)
apps/web/lib/useGame.ts              game lifecycle (persistence hooks in Phase 2)
apps/web/public/viewport-lab.html    responsive test harness
```

## Risk areas

- **Framer-motion shared elements**: piece animations key off `layoutId` and DOM order;
  orientation switches must keep DOM order identical (they do — transpose is CSS placement only).
- **Engine serialization**: Phase 2 must persist engine-versioned payloads, not ad-hoc state;
  any shape change requires a new `@2` version (CLAUDE.md rule 4).
- **`aspect-ratio` fit approximation**: frame ratio includes padding/gaps ⇒ tiles deviate a few
  % from square (AG-5, cosmetic).
- **No web unit tests**: web correctness rides on typecheck + manual matrices; keep the manual
  lists honest (TEST_PLAN).
- **Undo vs future persistence**: restoring must land on an actionable phase; AI-turn timing
  lives in `useGame` effects — persistence must not resurrect a mid-think state.

## Recommended implementation order

Matches `/MASTER_PROMPT.md` Phase 13, no deviation found necessary:

1. ~~Audit~~ (this doc) → 2. **Responsive fit + full viewport matrix** (in progress, this
branch) → 3. **Persistence + New Game confirmation** → 4. UI cohesion → 5. Tutorial →
6. AI 6-tier mapping + hints → 7. Stats/leaderboard prep → 8. Menu/settings shell →
9. Multiplayer planning docs → 10. Full checks → 11. Commit (push blocked on AG-1).
