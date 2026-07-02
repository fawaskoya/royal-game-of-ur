# Task backlog

Live, per-subsystem. Keep entries actionable; move finished items to the bottom with dates. Phase gates live in [ROADMAP.md](ROADMAP.md).

## engine

- [ ] `startingPlayer` option / dice-off for who goes first (state supports it; expose in `createGame` options + ruleset docs)
- [ ] Research + implement the late-Babylonian long path as `pathId: "long"` (needs sources — see GAME_RULES.md; do not invent)
- [ ] Lightweight `SearchState` (history-free) for deeper AI search
- [ ] Micro-benchmark suite (`applyMove`/`legalMoves` ops/sec) to guard regressions

## ai

- [ ] Master tier: time-budgeted MCTS (UCT, greedy rollouts)
- [ ] Grandmaster tier: learned eval (self-play dataset via `runMatch`), opening book, ≤3v3 endgame solver
- [ ] Hint API: `{best, alternatives, winChance, reasons[]}` from eval-term deltas
- [ ] Puzzle generator: only-move filter over replay corpora
- [ ] Star-1 pruning + transposition table when depth 4 is wanted

## web

- [ ] Dice roll animation sequence + tetrahedra visuals (physics/quick/instant setting)
- [ ] Sound pass + settings (mute, minimalist)
- [ ] Light/parchment theme via existing CSS tokens
- [ ] Interactive tutorial mode
- [ ] Replay viewer (timeline scrub over `replayStateAt`, import/export files)
- [ ] Auto-save/resume local games (serialize `GameSession` to localStorage)
- [ ] Statistics page (persist per-game summaries locally until accounts exist)
- [ ] Keyboard piece-selection polish + live-region move announcements (a11y spec in UI_UX.md)
- [ ] Board texture/lighting pass

## infra

- [ ] Create GitHub repo + push (no remote yet — ask which account: personal vs `potentdream`)
- [ ] CI: add web `next build` job once repo is on GitHub (workflow file ready)
- [ ] Sentry + PostHog wiring behind env flags (web)

## Done

- 2026-07-02 — Phase 0 + Phase 1 complete (engine 48 tests, AI ladder verified, CLI, playable web client). Initial commits `bff8c12`, `b8671cd`.
