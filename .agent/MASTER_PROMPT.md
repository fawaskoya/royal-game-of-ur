# Royal Game of Ur — Living Project Brain

This file is the **current mission state** for any agent working on this repo. The founding
directive (full detail, all phases) lives at [`/MASTER_PROMPT.md`](../MASTER_PROMPT.md) in the
repo root — read it once per engagement. This file tracks where we actually are and what matters
now. Update it whenever direction changes.

## Mission

Transform the working Royal Game of Ur prototype into a polished, responsive, persistent,
expandable premium web board game — historically authentic (Irving Finkel rules), honest AI,
future-ready for online multiplayer and leaderboards.

## Non-negotiable rules (from CLAUDE.md + founding prompt)

1. All gameplay rules live in `@ur/engine` only. AI picks among `legalMoves(state)`; it never cheats.
2. Engine stays dependency-free, DOM-free. Dice are inputs, never internal effects.
3. Serialization formats are versioned (`ur-state@1`); never mutate a shape in place — add `@2`.
4. Rules changes require tests in the same commit. `pnpm test` must stay green.
5. Architectural changes get an ADR in `docs/adr/` first; agentic decisions also logged in `.agent/DECISIONS.md`.
6. Conventional commits (`feat(web): …`, `fix(engine): …`). Web changes: `pnpm --filter @ur/web build` must pass before commit.
7. Never break existing gameplay. Never fix layout by allowing scroll. Never fake data without marking it mock.
8. No secrets/env files/build artifacts in git. No remote is configured yet — commits stay local until the founder adds one.

## Phase status (founding prompt order)

| Phase | Scope | Status |
|---|---|---|
| 0 | Project audit → `docs/PROJECT_AUDIT.md` | ✅ done |
| 1 | Responsive orientation + board fit (no scroll, all viewports) | ✅ done — `docs/RESPONSIVE_LAYOUT.md` |
| 2 | Game persistence (versioned save, restore, confirmations) | ✅ done 2026-07-04 — `docs/PERSISTENCE.md` |
| 3 | UI/UX cohesion polish | ✅ done 2026-07-04 — `docs/UI_UX_DESIGN_SYSTEM.md` |
| 4 | Gameplay feel (history, end-game summary, animations, hints UI) | ✅ done 2026-07-04 — `docs/GAMEPLAY_EXPERIENCE.md` |
| 5 | Tutorial section + interactive tutorial mode | ✅ done 2026-07-05 — `docs/TUTORIAL_AND_STRATEGY.md` |
| 6 | AI six-tier ladder (Master) + hint engine | ✅ done 2026-07-04 — `docs/AI_ENGINE.md` (master 56% vs expert) |
| 7 | Multiplayer architecture prep (docs + interfaces only) | ✅ done 2026-07-05 — `docs/MULTIPLAYER_ARCHITECTURE.md` |
| 8 | Local stats + leaderboard prep | ✅ done 2026-07-05 — `docs/LEADERBOARDS_AND_STATS.md` |
| 9 | Menu/settings app shell | ✅ done 2026-07-05 — `docs/APP_STRUCTURE_AND_SETTINGS.md` |
| 10 | `.agent/` system | ✅ done |
| 11 | Testing & quality expansion | ongoing (81 tests across 3 packages) |
| 12 | DevOps & git hygiene | ongoing (no remote yet — AG-1) |

**Next candidates:** dice-roll physics/tetrahedra visuals + sound pass (docs/TASKS.md web),
light/parchment theme, replay viewer, PWA, full-ladder bench re-run with Master, remote + CI
web-build job once the founder adds a GitHub remote.

## Current working branch

`fix/responsive-persistence-ux`

## How to work

1. Read `.agent/TASK_BACKLOG.md`, pick the highest-priority open item (or the loop the operator names).
2. Run the matching loop in `.agent/loops/` with the matching subagent role in `.agent/agents/`.
3. Verify per `.agent/TEST_PLAN.md` — responsive changes always go through the viewport matrix.
4. Update `.agent/CHANGELOG.md`, backlog, and the relevant `docs/*.md`.
5. Commit per `.agent/RELEASE_CHECKLIST.md`.
