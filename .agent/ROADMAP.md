# Agentic Roadmap

Execution order for the agentic system. Product-level roadmap (feature detail, long horizon)
lives in [`docs/ROADMAP.md`](../docs/ROADMAP.md) — this file sequences the *current improvement
campaign* from the founding prompt (`/MASTER_PROMPT.md`, Phase 13 implementation order).

## Campaign: prototype → polished product

1. **Audit** — `docs/PROJECT_AUDIT.md` ✅ (2026-07-04)
2. **Responsive fit** — both orientations fit every target viewport, no gameplay scroll ✅ (2026-07-04)
3. **Viewport matrix test** — 8 sizes, documented in `docs/RESPONSIVE_LAYOUT.md` ✅ (2026-07-04)
4. **Persistence** — auto-save/restore, versioned schema, corrupt-save safety ✅ (2026-07-04)
5. **New Game confirmation** — in-game + menu Begin modals ✅ (2026-07-04)
6. **UI cohesion + gameplay feel** — cards, dice, hints, history, win summary ✅ (2026-07-04)
7. **Tutorial** — guide + interactive scripted mode + strategy ✅ (2026-07-05)
8. **AI improvements** — Master tier (6 tiers), hint engine ✅ (2026-07-04)
9. **Stats + leaderboard prep** — MatchResult store, Stats panel, Elo plan ✅ (2026-07-05)
10. **App shell** — Continue/How-to/Stats/Settings, persisted settings ✅ (2026-07-05)
11. **Full checks** — 81 tests green, typecheck, prod build, 12/12 matrix ✅ (2026-07-05)
12. **Commit + push** — committed per milestone; push blocked until a remote exists (AG-1)

**Campaign complete.** Next wave candidates live in `.agent/MASTER_PROMPT.md` (dice physics +
sound, parchment theme, replay viewer, PWA, remote+CI).

## Sequencing rules

- A phase is done only when its loop's Done criteria pass and its doc is updated.
- Persistence (4) before any UI polish that changes state shape.
- Multiplayer stays docs/interfaces-only until local play is excellent (per `docs/MASTER_SPEC.md`).
