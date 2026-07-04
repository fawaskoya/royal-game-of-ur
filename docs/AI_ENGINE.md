# AI Engine — design and roadmap

`@ur/ai` provides opponents whose strength comes purely from decision quality. Agents receive `(state, legalMoves, {rng})` and must return one of the legal moves; they can never see future dice, re-roll, or bypass validation. **Difficulty never cheats.**

## Shipped ladder (six tiers)

| Tier | Agent | Mechanism |
| --- | --- | --- |
| Beginner | `randomAgent` | uniform over legal moves — misses captures and rosettes |
| Easy | `greedyAgent(ε=0.35)` | one-ply eval, but 35% of moves are uniformly random (honest blunders) |
| Medium | `greedyAgent(0)` | best static evaluation after each candidate move |
| Hard | `searchAgent(depth 2)` | expectimax, 2 future rolls |
| Expert | `searchAgent(depth 3)` | expectimax, 3 future rolls (~20 ms/move) |
| Master | `masterAgent` | expectimax, **4 future rolls** via beam pruning (top-3 children by static eval at inner move layers; the root decision is never pruned) + `MASTER_WEIGHTS` with the rosette-tempo term (~150 ms/move) |

Measured (seeded, seat-alternating; `pnpm bench` reproduces): easy > beginner 90%, medium > beginner 99%, hard > medium 70%, expert > hard 60%, **master > expert 56%** (100 games, seed 3, 2026-07-04 — re-run with a larger sample before any tier retune). Regression floor lives in `packages/ai/tests/strength.test.ts` — the ladder must stay strictly monotonic; search tiers are exercised for legality in `agents.test.ts` and benched via the CLI to keep the unit suite fast.

## Evaluation function (`eval.ts`)

`evaluate(state, perspective) = side(me) − side(them)`, per side:

- **finished** (320/piece) — borne-off material dominates;
- **progress** (14/square of path index) — the race term;
- **central-rosette control** (+28; master +32) — safe forward outpost on the shared lane;
- **danger** (×1.0; master ×1.05) — for each piece on a capturable shared square, expected loss = P(any opposing piece lands on it next throw, from the exact binomial distribution) × (its progress value + 40);
- **rosette potential** (0 default; master 30) — tempo term: P(this piece lands on a rosette next roll) × weight, approximating landing legality (skips own-piece squares, opponent-held safe rosettes, overshoots). The extra-turn chain is the core of strong Ur play; the term guides deep-leaf evaluation where search can no longer see the chain concretely. Disabled at weight 0 so default tiers pay no cost.

Terminal positions score ±(1,000,000 − rollCount), preferring faster wins. Weights are one tunable object (`EvalWeights`) — tiers ship tuned weights without touching the search.

## Search (`expectimax.ts`)

Expectimax with three layer types: max (our move), chance (dice, weighted by exact probabilities C(4,k)/16), min (their move). Rosette extra-turns need no special casing — the engine's `current` tells the search whose decision each node is. Depth counts chance layers. Branching ≤ 5 rolls × ≤ 7 moves keeps depth 3 around 4×10⁴ engine calls (instant).

**Beam pruning** (`beamWidth` in `SearchOptions`): at non-root move layers, children are ordered by the mover's static evaluation and only the top-K are searched. K=3 makes depth 4 cost roughly depth 3. The root is always full-width — pruning never hides a candidate from the actual decision, only from deeper opponent/self projections. Tuning history: depth-3 weight tweaks alone and narrow endgame-only deepening both measured ~49% vs expert; full-width depth 4 was ~20× cost; beam(3) depth 4 landed 56% at acceptable latency.

## Hint engine (`hint.ts`) — shipped

`analyzeMoves(state, {depth, weights})` scores every legal move with the same expectimax search (default depth 2) and tags each with engine-fact reasons: `capture`, `rosette`, `finish`, `enter`, `to-safety` (protected central rosette), `escapes-danger` (leaves a hit-probability square), `risky` (lands on one). `hintFor` returns the best. The web client phrases tags into copy ("lands on a rosette — roll again") and highlights the suggested piece/destination. Puzzle generation (only-move filter over replay corpora) remains planned on the same machinery.

## Next tiers (design, not yet built)

- **Grandmaster — hybrid:** expectimax with a learned evaluation (small value net trained on self-play from `runMatch` datasets), opening book mined from won games, endgame solver (positions with ≤ 3 pieces each are exactly solvable by retrograde analysis), opponent modeling for capture-risk appetite. MCTS remains an alternative backbone if beam expectimax plateaus.
- **Search speedups when needed:** strip history from search states (a lightweight `SearchState` mirror), star-1/star-2 pruning on chance nodes, transposition table keyed on `(positions, current, dice)`.

## Research hooks

`runMatch`/`playGame` are fully seeded and headless — dataset generation is a loop away. Replays serialize to versioned JSON (`ur-replay@1`) for training corpora. Planned: `Agent` adapters for external engines (UCI-style protocol) so research engines can be benchmarked against the ladder.
