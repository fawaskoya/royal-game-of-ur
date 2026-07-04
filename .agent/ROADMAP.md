# Agentic Roadmap

Execution order for the agentic system. Product-level roadmap (feature detail, long horizon)
lives in [`docs/ROADMAP.md`](../docs/ROADMAP.md) — this file sequences the *current improvement
campaign* from the founding prompt (`/MASTER_PROMPT.md`, Phase 13 implementation order).

## Campaign: prototype → polished product

1. **Audit** — `docs/PROJECT_AUDIT.md` ✅ (2026-07-04)
2. **Responsive fit** — both orientations fit every target viewport, no gameplay scroll ✅ (2026-07-04)
3. **Viewport matrix test** — 8 sizes, documented in `docs/RESPONSIVE_LAYOUT.md` ✅ (2026-07-04)
4. **Persistence** — auto-save/restore, versioned schema, corrupt-save safety → `docs/PERSISTENCE.md`
5. **New Game confirmation** — modal when a live game would be replaced
6. **UI cohesion** — player cards, dice area, stats, header adaptivity → `docs/UI_UX_DESIGN_SYSTEM.md`
7. **Tutorial** — section + interactive mode + strategy guide → `docs/TUTORIAL_AND_STRATEGY.md`
8. **AI improvements** — 6-tier ladder mapping, hint engine → `docs/AI_ENGINE.md`
9. **Stats + leaderboard prep** — local stats model, MatchResult schema → `docs/LEADERBOARDS_AND_STATS.md`
10. **App shell** — menu (Continue/New/modes/settings), persisted settings → `docs/APP_STRUCTURE_AND_SETTINGS.md`
11. **Full checks** — build, tests, typecheck, manual matrix
12. **Commit + push** — push blocked until a remote exists (see KNOWN_ISSUES)

## Sequencing rules

- A phase is done only when its loop's Done criteria pass and its doc is updated.
- Persistence (4) before any UI polish that changes state shape.
- Multiplayer stays docs/interfaces-only until local play is excellent (per `docs/MASTER_SPEC.md`).
