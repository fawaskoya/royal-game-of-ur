# Changelog

## [Unreleased] — 2026-07-09/10 real leaderboard + identity + rematch

### Added
- **Server-side Elo** (`supabase/functions/_shared/rating.ts`, same constants as the
  client's local module): applied when a game actually transitions playing → finished — the
  status-guarded UPDATE means retries/races can never double-count. Verified by a scripted
  328-event game to completion: exact 816/784 first-game ratings, gamesPlayed 1 apiece,
  post-game actions rejected.
- **Leaderboard** (menu → Leaderboard): top-20 casual pool via RLS-gated reads
  (ratings ⋈ profiles), own row highlighted; live in the panel with real rated players.
- **Player identity**: deterministic handles minted server-side on first contact
  ("Swift Heron 53"); "Playing as X · change name" in the online lobby (RLS own-profile
  update, 2–24 char DB constraint); room header shows "A vs B"; identity fetch doubles as a
  function warm-up against cold starts.
- **Rematch** (`rematch` action, migration `0004`): finished game points at its successor —
  seats swapped, idempotent (simultaneous clicks converge on ONE game — verified), and the
  games-row UPDATE doubles as the Realtime "opponent wants a rematch" signal. Win overlay:
  Rematch / Join rematch.
- **Online games join local records** (AG-14): once per game, a MatchResult + verifiable
  archive replay (`mode: online` with opponent handle); Stats' vs-AI numbers untouched;
  win overlay shows the fresh online rating with its delta.

### Fixed
- **Engine: replay verifier vs jsonb key order.** `buildStateFromEvents` compared capture
  objects via `JSON.stringify`, but Postgres jsonb canonicalizes key order — the first
  online game containing a capture failed server-side verification against its own stored
  log. Comparator is now field-by-field; regression test simulates jsonb reordering over a
  full game. (Local play never hit this — JS JSON preserves insertion order.)

## [2026-07-09] online-in-the-UI + grand redesign

### Added
- **Internet rooms are now playable from the app** (`useOnlineRoom`, `OnlineRoomView`
  online/same-device flows sharing one `RoomGameScreen`): create/join by code against the
  live Supabase backend, guest identity via anonymous auth, seq-slotted event ingestion with
  gap-triggered `resync()`, inline transport errors, one-in-flight action guard. Verified in
  the real UI: browser hosted room DEWN, a separate-account scripted guest joined and both
  sides' moves synced live over Realtime (migration `0003`: tables added to the
  `supabase_realtime` publication — without it postgres_changes never fires).
- **Homepage redesign**: split hero with gold-leaf display title, kicker ornaments, colossal
  rosette watermark, and a **living vignette** — a real engine session playing itself in slow
  motion on a display-tilted board (reduced-motion: advances silently to a still tableau);
  2×2 engraved-icon mode cards (die/discs/globe/eye) with an "online" chip; contextual config
  card; ornament-rule footer.
- **Material upgrade**: plaque tiles (corner studs + engraved double inlay ring), gold inlay
  line inside the board frame, ambient gold glow, "dice pit" tray (suede variant in parchment
  theme), embossed primary buttons, `.card`/`.gold-text`/`.ornament-rule` design tokens.
- Win overlay: gold-leaf title + engraved rule.

### Fixed
- **Logic flaws**: undo no longer possible after the game is decided (it contradicted the
  recorded result/archive — the win-screen `U` key was a live exploit); the `R` key can no
  longer roll for the AI or in watch mode (public `roll`/`movePiece` now refuse non-human
  actors outright); the Undo button is hidden (not just disabled) in watch mode.
- **Edge Function CORS**: preflight only allowed `authorization, content-type`, but
  supabase-js also sends `apikey` + `x-client-info` — browsers failed the preflight entirely
  (server-to-server calls had masked it). Now the standard four + `Access-Control-Max-Age`.
- **Cold starts**: one automatic retry (1.2s) on 5xx/fetch-level failures in the transport;
  staleness checks server-side make duplicates harmless. Friendly "server waking up" message.
- Parchment theme: `.btn` was night-wood with theme-flipped ink (dark-on-dark labels);
  buttons are aged paper in light theme, `btn-primary` stays gold in both.

## [2026-07-06] experience + multiplayer wave

### Added
- **Post-game analysis**: every real decision graded by the hint engine's search
  (`lib/analysis.ts`) — accuracy per player, best/good/inaccuracy/mistake/blunder bands,
  clickable key moments in the replay viewer, per-position grade captions; "Analyze" from the
  win screen and the archive. 7 unit tests incl. perfect-play-scores-100.
- **Game archive**: last 20 finished games stored as verifiable `ur-replay@1` payloads
  (`ur:archive` v1), menu "Replays" panel with Watch/Analyze/Delete; recorded once per game
  alongside MatchResults.
- **Training rating**: pure Elo module (`lib/rating/elo.ts`, the same rule a ranked server
  will run) + local trajectory vs fixed per-tier anchors; shown in Stats and as a delta on the
  win screen, explicitly labeled local/unranked.
- **Private room multiplayer (beta)**: full room flow — create/join by 4-letter code, seats,
  waiting states — over the `MultiplayerTransport` seam with a BroadcastChannel wire
  (`lib/multiplayer/`). Host tab embeds the stand-in server (owns dice, validates via engine,
  broadcasts event batches); every client re-verifies via `buildStateFromEvents`. Verified
  live across two windows. Internet wire = one class swap (GO_LIVE_PLAN L2).
- **PWA groundwork**: manifest, SVG + PNG icons (rosette), apple-touch metadata.
- **Menu**: Private room card, Replays entry, first-run pulse on "How to play".
- `docs/GO_LIVE_PLAN.md`: web → Supabase online → Capacitor store phases with costs and
  founder-gated steps.

### Fixed
- Full-screen replay viewer no longer fades in (a backgrounded tab could freeze the fade
  mid-way, leaving the view translucent).

## [2026-07-04/05] campaign (Phases 2–10)

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
