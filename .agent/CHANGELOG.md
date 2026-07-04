# Changelog

## [Unreleased] — 2026-07-04/05 campaign (Phases 2–10)

### Added
- **Persistence (Phase 2)**: versioned `SavedGame` over the engine's exact `ur-session@1`
  snapshot (state + RNG — resumed games roll the same future dice); auto-save each state
  change; Continue-game menu card; "Game restored" toast; New-Game confirmation modals;
  corrupt saves fail closed with replay cross-check (8 unit tests).
- **Master AI tier + hint engine (Phase 6)**: six-tier ladder — Master = depth-4 expectimax via
  beam pruning (top-3 inner children; root never pruned) + rosette-tempo eval term; measured
  56% vs Expert over 100 seeded games. `analyzeMoves`/`hintFor` tag engine-fact reasons for UI
  hints (3 new test suites).
- **Design/UX revamp (Phases 3+4)**: player cards with controller chip + home/board/capture
  counts and lit active edge; dice tumble + total pop; Hint button and H key with reason copy;
  capture-preview danger rings; last-move wash; move-history drawer (turn-grouped, latest
  first); win overlay with turns/duration/captures/rosettes; keyboard R/H/U/N/Esc; global
  focus-visible ring.
- **Tutorial (Phase 5)**: How-to-play modal (Rules + Strategy tabs, checked against
  GAME_RULES.md) and a 14-step interactive scripted first game on the real engine (forced
  rolls via `applyRoll(makeRoll(n))`, learner constrained to the scripted move, guide plays
  Dark); progress persists (`ur:tutorial`), exact mid-script resume by replay.
- **Stats + settings + menu shell (Phases 8+9)**: `MatchResult` computed from the event log at
  game end, stored versioned (`ur:results`, cap 200); Stats panel (win rate, streaks, captures,
  fastest/fewest-turn wins, per-difficulty); Settings (`ur:settings`): orientation
  auto/vertical/horizontal (pins layout), hints, confirm-new, motion system/reduced — applied
  live; menu rows How to play · Stats · Settings (4 new tests).
- **Multiplayer prep (Phase 7)**: `MULTIPLAYER_ARCHITECTURE.md` (backend evaluation — Supabase
  recommended per binding ONLINE_ARCHITECTURE; MVP phasing; trust boundaries) +
  `lib/network/types.ts` transport seam (types only, event-batch sync).
- Orientation system: portrait/vertical and landscape/horizontal board layouts. Touch devices
  follow OS rotation automatically; desktop gets a header toggle (persisted in localStorage).
- `?layout=vertical|horizontal` URL override for testing (dev/test only, not persisted).
- Viewport lab (`apps/web/public/viewport-lab.html`): iframe harness with preset device sizes
  and a live FIT/OVERFLOW badge for responsive verification.
- `.agent/` agentic system: master prompt, roadmap, backlog, decisions, known issues, test plan,
  release checklist, 12 subagent role specs, 14 improvement loops.

### Changed
- Game screen no longer scrolls in either orientation: board scales to the space left by
  header/panels/dice via CSS container queries (`--bcols`/`--brows` aspect fit).
- Horizontal sidebar width and column gap are now fluid (`clamp()`), so phone-landscape fits.
- Header, player panels, and dice tray compact themselves under short viewports
  (`@media (max-height: …)`).
- Dice tray: status line moved below the dice/roll row (pre-existing uncommitted work, folded in).

### Fixed
- Horizontal mode overflowed the viewport (board too large; page scrolled) — now fits on all
  eight target viewports from 390×844 to 1920×1080.
- Vertical mode overflowed on mobile portrait (tiles ~118px on 390px width) — now fits.
- Board in horizontal mode collapsed to ~84px when centered in a flex parent (aspect-ratio with
  auto size has no growth signal) — fixed with container-query sizing.

### Technical
- `useGameLayout` hook: touch/orientation media queries + persisted preference + test override;
  now layered under Settings (`?layout=` > pinned setting > auto).
- `Board` accepts `orientation` prop; vertical transposes the grid (3×8) in CSS placement only —
  engine coordinates untouched.
- ADR 0004: container-query board sizing (CSS-first, no JS resize listeners).
- Beam pruning added to `expectimax` (`beamWidth` option); `MASTER_WEIGHTS` +
  `rosettePotential` eval term (0-cost when disabled).
- Vitest added to `@ur/web` (persistence + stats suites). Workspace totals: engine 48, ai 17,
  web 16 tests.
- Dev hygiene rule: never run `next build` while `next dev` shares `.next` — it corrupts the
  dev server's chunks (hydration dies with 404s). Stop dev or clean-restart after building.

### Documentation
- `docs/PROJECT_AUDIT.md` (Phase 0), `docs/RESPONSIVE_LAYOUT.md` (Phase 1), ADR 0004,
  `.agent/*` system files.
