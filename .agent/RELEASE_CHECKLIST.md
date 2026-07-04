# Release / Commit Checklist

Run top to bottom before every milestone commit; all boxes must pass.

## Code

- [ ] `pnpm test` green (engine + ai)
- [ ] `pnpm typecheck` green
- [ ] `pnpm --filter @ur/web build` succeeds (mandatory for web changes)
- [ ] No gameplay logic outside `@ur/engine`; no AI access to future dice
- [ ] Serialization shapes unchanged, or added as a new `@N` version

## Product

- [ ] Gameplay regression list passed (`.agent/TEST_PLAN.md`)
- [ ] Responsive change? → full viewport matrix run, badges FIT
- [ ] No new scroll during gameplay; nothing clipped
- [ ] Reduced-motion + keyboard paths still work

## Docs

- [ ] `.agent/CHANGELOG.md` updated (Added/Changed/Fixed/Technical/Documentation)
- [ ] Relevant `docs/*.md` updated (audit / responsive / persistence / …)
- [ ] `.agent/TASK_BACKLOG.md` + `docs/TASKS.md` items ticked
- [ ] New architectural choice? → ADR in `docs/adr/` + entry in `.agent/DECISIONS.md`
- [ ] `.agent/KNOWN_ISSUES.md` — new issues logged, fixed ones moved to Resolved

## Git

- [ ] On a feature branch (or deliberately on `main`)
- [ ] Surgical `git add` (no `.env`, secrets, `node_modules`, build output, stray screenshots)
- [ ] Conventional commit message (`fix(web): …`) ending with the Claude co-author line
- [ ] Push if a remote exists; otherwise note "local only — no remote configured" in the report
