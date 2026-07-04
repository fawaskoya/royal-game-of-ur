# DevOps & Release Loop

## Mission
Milestones land as clean, verifiable commits; the repo stays healthy and secret-free; releases
are boring. Agent: `devops-agent`.

## Inputs
A completed milestone awaiting commit; `.agent/RELEASE_CHECKLIST.md`; CI state.

## Files to inspect
`git status` / `git diff --stat` / `git log --oneline -10` / `git remote -v`, `.gitignore`,
`.github/workflows/**`, changed files list.

## Steps
1. Walk `RELEASE_CHECKLIST.md` top to bottom — code gates, product gates, docs gates.
2. Review the staging set file-by-file: no secrets, env files, node_modules, build artifacts,
   stray screenshots/scratch files.
3. Stage surgically (explicit paths); write a conventional commit
   (`feat(web): …` / `fix(engine): …`) with the Claude co-author trailer.
4. Push if a remote exists. Today none does (KNOWN_ISSUES AG-1): record "local only" + the
   hash in the loop report. When the founder adds a remote: `git push -u origin <branch>` for
   every local branch, then enable the CI web-build job (docs/TASKS.md infra).
5. Keep branches tidy: merge/delete stale feature branches with founder approval only.

## Checks
`git show --stat HEAD` matches intent exactly; working tree clean afterward; CI (when active)
green on the pushed ref.

## Tests to run
Whatever the checklist demands for the changed surface (minimum: `pnpm test` + web build).

## Documentation to update
`.agent/CHANGELOG.md` finalized for the milestone; `.agent/MASTER_PROMPT.md` phase table;
KNOWN_ISSUES push-status note.

## Git commit format
Conventional commits; body lists test evidence; co-author trailer required.

## Done criteria
Milestone committed with all gates passed and an honest push-status statement.
