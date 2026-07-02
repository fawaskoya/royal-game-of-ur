# Royal Game of Ur

The definitive digital version of the world's oldest playable board game (c. 2600 BCE) — built to the standard of premium chess and backgammon platforms: historically authentic rules, honest AI opponents, verified replays, and (eventually) competitive online play.

**Vision:** the player should feel like they are touching an ancient artifact brought into the modern world. See [docs/MASTER_SPEC.md](docs/MASTER_SPEC.md).

## Status — Phase 1 complete

| Piece | State |
| --- | --- |
| `@ur/engine` — pure deterministic rules engine (Finkel rules, variants, verified replay, undo, serialization) | ✅ 48 tests |
| `@ur/ai` — difficulty ladder: beginner → expert (expectimax over true dice odds; never cheats) | ✅ 14 tests, monotonic ladder |
| `@ur/cli` — demo / sim / bench terminal runner | ✅ |
| `@ur/web` — playable local game (PvP, vs AI, AI vs AI) with animated board | ✅ functional; visual-polish phase pending |
| Online multiplayer, accounts, rankings | 📋 designed in [docs/ONLINE_ARCHITECTURE.md](docs/ONLINE_ARCHITECTURE.md), not started |

See [docs/ROADMAP.md](docs/ROADMAP.md) for phases and [docs/TASKS.md](docs/TASKS.md) for the live backlog.

## Quickstart

```bash
pnpm install
pnpm test          # full test suite (engine + ai)
pnpm demo          # watch a narrated expert-vs-medium game in the terminal
pnpm sim -- --games 100 --p0 hard --p1 beginner
pnpm bench         # validate the whole difficulty ladder
pnpm dev           # web client at http://localhost:3000
```

## Structure

```
packages/engine    Pure rules engine. Zero deps, zero UI. Every move in every
                   client goes through here — gameplay is never hardcoded elsewhere.
packages/ai        Agents (random / greedy / expectimax) + match runner.
apps/cli           Terminal demo, simulator, ladder benchmark.
apps/web           Next.js client (React 19, Tailwind 4, Framer Motion).
docs/              Master spec, rules, AI design, online architecture, UI/UX,
                   roadmap, tasks, ADRs.
```

## Documentation

| Doc | Purpose |
| --- | --- |
| [MASTER_SPEC.md](docs/MASTER_SPEC.md) | The full product vision — the source of truth for scope and priorities |
| [GAME_RULES.md](docs/GAME_RULES.md) | Exact rules as implemented: board, path, dice, captures, rosettes, variants |
| [AI_ENGINE.md](docs/AI_ENGINE.md) | Evaluation, search, difficulty ladder, path to MCTS/NN tiers |
| [ONLINE_ARCHITECTURE.md](docs/ONLINE_ARCHITECTURE.md) | Server-authoritative multiplayer design (future phase) |
| [UI_UX.md](docs/UI_UX.md) | Design language, interaction spec, animation principles, accessibility |
| [ROADMAP.md](docs/ROADMAP.md) | Phases with completion criteria |
| [TASKS.md](docs/TASKS.md) | Actionable backlog per subsystem |
| [docs/adr/](docs/adr/) | Architectural decision records |

## Engineering invariants

1. **The engine is law.** All legality, captures, rosettes, and win detection live in `@ur/engine`. UIs and AIs only call it.
2. **Determinism.** Dice are *inputs* to transitions. Same events ⇒ same state, bit for bit — which is what makes replays verifiable and servers authoritative.
3. **Immutability.** `GameState` is frozen plain data; every transition returns a new state.
4. **No temporary hacks.** If a better design appears mid-build, it goes through an ADR first.
