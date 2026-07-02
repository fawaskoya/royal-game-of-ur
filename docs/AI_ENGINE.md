# AI Engine — design and roadmap

`@ur/ai` provides opponents whose strength comes purely from decision quality. Agents receive `(state, legalMoves, {rng})` and must return one of the legal moves; they can never see future dice, re-roll, or bypass validation. **Difficulty never cheats.**

## Shipped ladder (Phase 1)

| Tier | Agent | Mechanism |
| --- | --- | --- |
| Beginner | `randomAgent` | uniform over legal moves — misses captures and rosettes |
| Easy | `greedyAgent(ε=0.35)` | one-ply eval, but 35% of moves are uniformly random (honest blunders) |
| Medium | `greedyAgent(0)` | best static evaluation after each candidate move |
| Hard | `searchAgent(depth 2)` | expectimax, 2 future rolls |
| Expert | `searchAgent(depth 3)` | expectimax, 3 future rolls (~20 ms/move) |

Measured (seeded, seat-alternating; `pnpm bench` reproduces): easy > beginner 90%, medium > beginner 99%, hard > medium 70%, expert > hard 60%. Regression floor lives in `packages/ai/tests/strength.test.ts` — the ladder must stay strictly monotonic.

## Evaluation function (`eval.ts`)

`evaluate(state, perspective) = side(me) − side(them)`, per side:

- **finished** (320/piece) — borne-off material dominates;
- **progress** (14/square of path index) — the race term;
- **central-rosette control** (+28) — safe forward outpost on the shared lane;
- **danger** — for each piece on a capturable shared square, expected loss = P(any opposing piece lands on it next throw, from the exact binomial distribution) × (its progress value + 40).

Terminal positions score ±(1,000,000 − rollCount), preferring faster wins. Weights are one tunable object (`EvalWeights`) — future tiers may ship tuned or learned weights without touching the search.

## Search (`expectimax.ts`)

Expectimax with three layer types: max (our move), chance (dice, weighted by exact probabilities C(4,k)/16), min (their move). Rosette extra-turns need no special casing — the engine's `current` tells the search whose decision each node is. Depth counts chance layers. Branching ≤ 5 rolls × ≤ 7 moves keeps depth 3 around 4×10⁴ engine calls (instant); depth 4 is feasible with the optimizations below.

## Next tiers (design, not yet built)

- **Master — MCTS:** UCT self-play rollouts with the greedy policy as rollout policy; time-budgeted (e.g. 200 ms/move) for human-like variability; reuse tree across the opponent's forced replies.
- **Grandmaster — hybrid:** expectimax with a learned evaluation (small value net trained on self-play from `runMatch` datasets), opening book mined from won games, endgame solver (positions with ≤ 3 pieces each are exactly solvable by retrograde analysis over the ~small state space), opponent modeling for capture-risk appetite.
- **Search speedups when needed:** strip history from search states (a lightweight `SearchState` mirror), star-1/star-2 pruning on chance nodes, transposition table keyed on `(positions, current, dice)`.

## Research hooks

`runMatch`/`playGame` are fully seeded and headless — dataset generation is a loop away. Replays serialize to versioned JSON (`ur-replay@1`) for training corpora. Planned: `Agent` adapters for external engines (UCI-style protocol) so research engines can be benchmarked against the ladder.

## Hint engine & puzzles (planned, same machinery)

- **Hints:** run expert search on the player's position; report best move, top alternatives with expected values, and a natural-language reason derived from eval-term deltas (capture avoided, rosette gained, race won).
- **Puzzle generator:** scan replay corpora for positions where exactly one move preserves/flips the game-theoretic result at fixed depth ("only-move" filter); grade by depth needed to see it.
