# Task Backlog

Live backlog for the agentic campaign. Engineering-level backlog per subsystem lives in
[`docs/TASKS.md`](../docs/TASKS.md); keep the two consistent when closing items.

## Critical

- [x] Fix horizontal mode overflow (board fits viewport, no scroll) — 2026-07-04
- [x] Add responsive board scaling (container-query fit, both orientations) — 2026-07-04
- [x] Add game persistence (auto-save/restore, versioned schema) — 2026-07-04
- [x] Add New Game confirmation when a saved/live game exists — 2026-07-04

## High

- [x] Improve player stats layout (controller chip, home/board/capture counts) — 2026-07-04
- [x] Add tutorial entry point in menu (How to play + Learn to play) — 2026-07-05
- [x] AI six-tier ladder — Master added (beam depth-4, 56% vs expert) — 2026-07-04
- [x] End-game summary screen (turns, duration, captures, rosettes) — 2026-07-04
- [x] Move history panel (turn-grouped drawer) — 2026-07-04

## Medium

- [x] Settings panel (orientation pin, hints, confirm-new, motion) — 2026-07-05 (sound arrives with the audio pass)
- [x] Hint engine using AI evaluation (+ H key, reason copy, board highlight) — 2026-07-04
- [ ] Dice roll animation upgrade — basic tumble shipped 2026-07-04; physics/quick/instant modes + tetrahedra visuals remain (docs/TASKS.md web)
- [x] Local stats model + MatchResult schema (+ Stats panel) — 2026-07-05
- [x] Keyboard shortcuts R/H/U/N/Esc — 2026-07-04

## Low

- [ ] Light/parchment theme — tokens exist in globals.css
- [ ] Sound design pass (+ settings toggle)
- [ ] Replay viewer UI (engine support already exists)
- [ ] Full-ladder `pnpm bench` re-run including Master (long: ~150ms/move); record in AI_ENGINE.md

## Future

- [x] Multiplayer transport interfaces + backend recommendation — 2026-07-05 (docs + types only)
- [x] Leaderboard categories + Elo plan — 2026-07-05 (docs only)
- [ ] PWA (offline, installable)
- [ ] Create GitHub remote + push (founder must choose account — blocked on founder, AG-1)
