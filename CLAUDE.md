# Royal Game of Ur — agent guide

Premium digital Royal Game of Ur (vision: chess.com/Lichess quality). pnpm monorepo, strict TypeScript, ESM everywhere.

## Commands

```bash
pnpm install                 # once
pnpm test                    # all tests (engine 48, ai 14) — must stay green
pnpm typecheck               # all packages
pnpm demo                    # narrated CLI game — quick end-to-end sanity check
pnpm bench                   # AI ladder validation (each tier must beat the one below)
pnpm dev                     # web client on :3000
pnpm --filter @ur/web build  # production build — must pass before committing web changes
```

Flags pass through with `--`, e.g. `pnpm sim -- --games 50 --p0 expert --p1 hard --seed 3`.

## Architecture (dependency direction: web/cli → ai → engine)

- `packages/engine` — **the only place gameplay rules exist.** Pure functions over immutable `GameState`; dice results are inputs (`applyRoll(state, roll)`), never internal effects. Event-sourced history drives replay/undo/verification (`buildStateFromEvents` re-validates every event — this is the future anti-cheat).
- `packages/ai` — agents choose among `legalMoves(state)`; they must never see future dice or bypass validation. Difficulty = decision quality, not cheating.
- `apps/web` — Next.js App Router. All game logic lives in `lib/useGame.ts` calling the engine; components are rendering + input only.
- Path indices are per-player: 0 = start pool, 1–14 = board, 15 = finished. Shared lane = indices 5–12; rosettes at 4, 8, 14; index 8 (central rosette) is safe under classic rules.

## Hard rules

1. Never implement move legality, captures, rosettes, or win detection outside `@ur/engine`.
2. Engine keeps **zero runtime dependencies** and no DOM/Node API usage.
3. Any rules-engine change requires tests in the same commit; run the fuzz suite (`pnpm --filter @ur/engine test`).
4. Serialization formats (`ur-state@1`, `ur-replay@1`) are versioned — never change their shape in place; add `@2` alongside.
5. New rule variants = new `RulesetConfig` knobs + preset, never `if (variant)` scattered in logic.
6. Architectural changes get an ADR in `docs/adr/` first.
7. Conventional commits (`feat(engine): …`, `fix(web): …`).

## Docs map

`docs/MASTER_SPEC.md` (vision/scope) · `docs/GAME_RULES.md` (exact rules + variant semantics) · `docs/AI_ENGINE.md` (eval/search design, ladder targets) · `docs/ONLINE_ARCHITECTURE.md` (server-authoritative plan) · `docs/UI_UX.md` (design language) · `docs/ROADMAP.md` + `docs/TASKS.md` (what's next) · `docs/adr/` (decisions).

## Current phase

Phase 1 (foundation: engine + AI + CLI + functional web client) is **complete**. Next: Phase 2 polish pass (see ROADMAP) — dice-roll animation upgrade, sound, tutorial, then persistence. Online play only after local play is excellent.
