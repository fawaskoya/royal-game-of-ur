# Task backlog

Live, per-subsystem. Keep entries actionable; move finished items to the bottom with dates. Phase gates live in [ROADMAP.md](ROADMAP.md).

## engine

- [ ] `startingPlayer` option / dice-off for who goes first (state supports it; expose in `createGame` options + ruleset docs)
- [ ] Research + implement the late-Babylonian long path as `pathId: "long"` (needs sources — see GAME_RULES.md; do not invent)
- [ ] Lightweight `SearchState` (history-free) for deeper AI search
- [ ] Micro-benchmark suite (`applyMove`/`legalMoves` ops/sec) to guard regressions

## ai

- [x] Master tier — shipped 2026-07-04 as beam-pruned depth-4 expectimax (56% vs expert); MCTS remains the fallback architecture if beam plateaus
- [ ] Grandmaster tier: learned eval (self-play dataset via `runMatch`), opening book, ≤3v3 endgame solver
- [x] Hint API — shipped 2026-07-04 (`analyzeMoves`/`hintFor`: values + engine-fact tags; win-chance display still open)
- [ ] Puzzle generator: only-move filter over replay corpora
- [ ] Star-1 pruning + transposition table (beam pruning shipped instead; these remain for deeper search)
- [ ] Full-ladder `pnpm bench` re-run including Master; record fresh rates in AI_ENGINE.md

## web

- [ ] Dice tetrahedra visuals + roll-speed setting (basic tumble shipped 2026-07-04)
- [ ] Sound pass + settings (mute, minimalist)
- [ ] Light/parchment theme via existing CSS tokens
- [x] Interactive tutorial mode — shipped 2026-07-05 (+ How-to-play guide)
- [ ] Replay viewer (timeline scrub over `replayStateAt`, import/export files)
- [x] Auto-save/resume local games — shipped 2026-07-04 (versioned save over `ur-session@1`)
- [x] Statistics page — shipped 2026-07-05 (MatchResult store + Stats panel)
- [x] Keyboard shortcuts + live-region announcements — R/H/U/N/Esc shipped 2026-07-04 (piece-selection arrow-key polish still open)
- [ ] Board texture/lighting pass

## infra

- [ ] Create GitHub repo + push (no remote yet — ask which account: personal vs `potentdream`)
- [ ] CI: add web `next build` job once repo is on GitHub (workflow file ready)
- [ ] Sentry + PostHog wiring behind env flags (web)

## Done

- 2026-07-05 — Campaign phases 2–10 complete: persistence (versioned save over `ur-session@1`,
  Continue card, confirmations), design/UX revamp (panels with real counts, dice tumble, hint
  UI, capture rings, last-move wash, history drawer, win summary, keyboard R/H/U/N/Esc),
  Master AI tier (beam depth-4, 56% vs expert) + hint engine in @ur/ai, tutorial (guide +
  14-step interactive scripted mode), local stats (MatchResult store + panel), settings
  (orientation pin/hints/confirm/motion), multiplayer plan + transport types. 81 tests, 12/12
  viewport matrix. Docs: PERSISTENCE, UI_UX_DESIGN_SYSTEM, GAMEPLAY_EXPERIENCE,
  TUTORIAL_AND_STRATEGY, AI_ENGINE (updated), LEADERBOARDS_AND_STATS,
  APP_STRUCTURE_AND_SETTINGS, MULTIPLAYER_ARCHITECTURE.
- 2026-07-04 — Responsive orientation system: portrait/landscape board layouts (touch follows
  OS rotation, desktop toggle), container-query board fit, no-scroll game screen, compact
  chrome for short viewports, viewport lab + 8-size matrix verified (see
  docs/RESPONSIVE_LAYOUT.md, ADR 0004). Agentic system added under `.agent/`.
- 2026-07-02 — Phase 0 + Phase 1 complete (engine 48 tests, AI ladder verified, CLI, playable web client). Initial commits `bff8c12`, `b8671cd`.
