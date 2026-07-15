# Cosmetics monetization sprint (Fable 5)

Working directory for the **Atelier / cosmetics** sprint.

## Canonical mega prompt

**Read and execute:** [`docs/FABLE5_COSMETICS_MEGA_PROMPT.md`](../../docs/FABLE5_COSMETICS_MEGA_PROMPT.md)

That document is the full orchestrator prompt: safety rules, subagents, loops, waves, commerce, catalog, acceptance criteria.

## Files the orchestrator creates in Wave 0

| File | Purpose |
| --- | --- |
| `CONTRACT.md` | Locked SKU scheme, loadout shape, data-attrs, free defaults — shared by all subagents |
| `TASK_BOARD.md` | `todo \| doing \| done \| blocked` backlog |
| `WAVE_LOG.md` | Wave results + safety attestation (no prod / no push) |

## Related agents & loops (created by orchestrator)

- Agents: `.agent/agents/cosmetics-*.md`
- Loops: `.agent/loops/20-cosmetics-*.md` … `30-cosmetics-docs-loop.md`

## Safety (reminder)

- Dev server only
- No production deploy
- No git push unless human explicitly commands it
- Dodo **test** mode only
- No pay-to-win
