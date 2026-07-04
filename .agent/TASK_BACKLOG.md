# Task Backlog

Live backlog for the agentic campaign. Engineering-level backlog per subsystem lives in
[`docs/TASKS.md`](../docs/TASKS.md); keep the two consistent when closing items.

## Critical

- [x] Fix horizontal mode overflow (board fits viewport, no scroll) — 2026-07-04
- [x] Add responsive board scaling (container-query fit, both orientations) — 2026-07-04
- [x] Add game persistence (auto-save/restore, versioned schema) — 2026-07-04
- [x] Add New Game confirmation when a saved/live game exists — 2026-07-04

## High

- [ ] Improve player stats layout (panel hierarchy, home/board/hand counts) — Phase 3
- [ ] Add tutorial entry point in menu — Phase 5
- [ ] Improve AI difficulty structure to 6 named tiers (map existing 5-tier ladder) — Phase 6
- [ ] End-game summary screen (turns, captures, rosettes) — Phase 4
- [ ] Move history panel — Phase 4

## Medium

- [ ] Settings panel (orientation pref, animation speed, sound, hints, confirm-new) — Phase 9
- [ ] Hint engine using AI evaluation — Phase 6
- [ ] Dice roll animation upgrade (physics/quick/instant) — Phase 4 (also docs/TASKS.md web)
- [ ] Local stats model + MatchResult schema — Phase 8
- [ ] Keyboard shortcuts (R roll exists; add U/N/H/Esc) — Phase 3

## Low

- [ ] Light/parchment theme — Phase 3 (tokens exist in globals.css)
- [ ] Sound design pass — Phase 4
- [ ] Replay viewer UI (engine support already exists) — Phase 4+

## Future

- [ ] Multiplayer transport interfaces + backend recommendation — Phase 7 (docs only)
- [ ] Leaderboard categories + Elo plan — Phase 8 (docs only)
- [ ] PWA (offline, installable)
- [ ] Create GitHub remote + push (founder must choose account — blocked on founder)
