# Roadmap

Phases complete one at a time (master-spec workflow: never jump ahead; refactor, test, benchmark, and document at each milestone). A phase is done only when its checklist is fully green.

## ✅ Phase 0 — Foundation (done, 2026-07-02)

Monorepo (pnpm + strict TS), docs suite, ADRs, CI workflow.

## ✅ Phase 1 — Rules engine, AI, proof clients (done, 2026-07-02)

- [x] `@ur/engine`: Finkel rules, variant knobs, immutable state, event-sourced history, verified replay, undo, serialization, seeded dice — 48 tests incl. 120-game fuzz
- [x] `@ur/ai`: eval + expectimax, 5-tier honest ladder, seeded match runner — monotonic strength verified
- [x] `@ur/cli`: demo / sim / bench
- [x] `@ur/web`: playable local game — PvP, vs AI (5 tiers), AI showcase; animated moves/captures; responsive; reduced-motion support

## Phase 2 — Game feel & presentation

- [ ] Dice: dedicated roll animation sequence (physics / quick / instant modes), tetrahedra visuals
- [ ] Sound design pass (see UI_UX.md) with minimalist + mute modes
- [ ] Light (parchment) theme; texture pass on board and pieces
- [ ] Piece-move micro-animation upgrade (anticipation/settle tuning), capture + victory sequences
- [ ] Interactive tutorial (movement → rosettes → capture → blocking → bear-off → history notes)
- [ ] Local persistence: auto-save/resume, saved-game list (localStorage; formats already versioned)
- [ ] In-app replay viewer with timeline scrubbing, export/import (engine support already done)

## Phase 3 — Depth

- [x] Hint engine + move explanations; post-game analysis (blunder detection via eval deltas)
- [ ] Statistics dashboard (games, win rates, capture rate, rosette usage, streaks, accuracy)
- [x] Puzzle generator + daily puzzle (date-seeded, one per UTC day — `apps/web/lib/daily.ts`)
- [ ] Master (MCTS) and Grandmaster (hybrid) AI tiers; AI benchmarking harness expansion
- [ ] PWA (offline, installable)

## Phase 4 — Online (design locked in ONLINE_ARCHITECTURE.md)

- [ ] Supabase auth (guest → Google/Apple/Discord) and profiles
- [ ] Server-authoritative games, commit–reveal dice, replay verification
- [ ] Casual matchmaking, invite links, reconnection, spectating
- [ ] Elo ranked pool, leaderboards, seasons → Glicko-2, divisions
- [ ] Tournaments, daily arena

## Phase 5 — Platform & product

Cosmetic themes (no pay-to-win), achievements, education/academy mode, Electron/Steam, mobile stores, community features. Long-horizon: opening explorer, AI coach, VR/AR — see MASTER_SPEC.
