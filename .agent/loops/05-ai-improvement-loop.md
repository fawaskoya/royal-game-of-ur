# AI Improvement Loop

## Mission
Playing the machine feels meaningful at every tier — honest strength, distinct personalities
per difficulty, no cheating ever. Agent: `ai-strategy-agent`.

## Inputs
Phase 6 spec in `/MASTER_PROMPT.md` (6 named tiers: Beginner→Master); `docs/AI_ENGINE.md`
ladder targets; bench results.

## Files to inspect
`packages/ai/src/**` (eval, expectimax, ladder, match runner), `packages/ai` tests,
`docs/AI_ENGINE.md`, docs/TASKS.md ai section (MCTS Master tier, hint API, pruning).

## Steps
1. Baseline: `pnpm bench` — record current tier-vs-tier win rates with seeds.
2. Pick one rung: eval-term improvement, search depth/pruning (star-1, transposition table),
   new tier (Master/MCTS), or difficulty-profile tuning.
3. Implement inside `@ur/ai`; agents consume `legalMoves(state)` only; keep seeded determinism.
4. Map/rename tiers to the founding prompt's 6 names if adding a tier; UI copy follows.
5. Re-bench: the ladder must stay monotonic (each tier beats the one below at ≥55% over enough
   seeded games to be significant).
6. Hint engine work uses the same scoring path with reason extraction from eval-term deltas.

## Checks
No illegal move across ≥100 seeded sim games per changed tier; per-move latency within the UX
budget; weaker tiers still feel *plausibly human*, not random-stupid.

## Tests to run
`pnpm --filter @ur/ai test` · `pnpm bench` (record numbers) · `pnpm sim -- --games 50 --p0
<new> --p1 <below> --seed 3` · web smoke vs the changed tier.

## Documentation to update
`docs/AI_ENGINE.md` (ladder table with fresh win rates), `.agent/CHANGELOG.md`,
`.agent/DECISIONS.md` for search-architecture choices.

## Git commit format
`feat(ai): <tier/eval/search change>` — include bench evidence in the body.

## Done criteria
Monotonic ladder proven by fresh bench numbers; latency budget held; docs show the new truth.
