# Changelog

## [Unreleased]

### Added
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
- `useGameLayout` hook: touch/orientation media queries + persisted preference + test override.
- `Board` accepts `orientation` prop; vertical transposes the grid (3×8) in CSS placement only —
  engine coordinates untouched.
- ADR 0004: container-query board sizing (CSS-first, no JS resize listeners).

### Documentation
- `docs/PROJECT_AUDIT.md` (Phase 0), `docs/RESPONSIVE_LAYOUT.md` (Phase 1), ADR 0004,
  `.agent/*` system files.
