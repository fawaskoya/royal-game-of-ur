# Known Issues

Status: Open | In Progress | Mitigated | Resolved

## Open

| ID | Issue | Impact | Plan |
|----|-------|--------|------|
| AG-4 | No lint script configured (`pnpm lint` doesn't exist). | Style drift risk. | Don't invent commands (founding prompt). Consider adding ESLint in a devops loop; until then typecheck + tests are the gate. |
| AG-5 | Tile squareness in fit mode is approximate (frame `aspect-ratio` includes padding/gaps, so tiles deviate a few % from square). | Cosmetic only. | Accepted; revisit if a texture pass makes it visible. |
| AG-6 | Dev-only `?layout=` override bypasses touch auto-orientation. | Could confuse if shared in a URL. | Test-only by convention; remove or gate if it causes confusion. |
| AG-7 | In-game `motion.button` layout animations run under `MotionConfig reducedMotion="user"`, but the win overlay uses opacity/scale — verify full reduced-motion coverage in the a11y pass. | A11y. | Phase 3 UI loop checks `prefers-reduced-motion`. |

## Resolved

| ID | Issue | Resolution |
|----|-------|------------|
| AG-2 | Game state reset on page refresh (no persistence). | 2026-07-04 — versioned save over engine `ur-session@1` with replay cross-check; auto-save/restore + Continue card (`docs/PERSISTENCE.md`, 8 unit tests). |
| AG-3 | No "New Game" confirmation — one tap wiped a live game. | 2026-07-04 — confirmation modal in-game and on menu Begin when a save exists. |
| AG-0a | Horizontal mode board overflowed viewport (required scrolling). | 2026-07-04 — container-query fit; verified on 8-viewport matrix (`docs/RESPONSIVE_LAYOUT.md`). |
| AG-0b | Vertical mode overflowed mobile portrait. | 2026-07-04 — same fit system; non-scrolling in both orientations. |
| AG-0c | Stale production server (`next start` from 2026-07-02) masked live edits during dev. | 2026-07-04 — killed; `pnpm dev` is the workflow (log: /tmp/ur-web-dev.log). |
| AG-8 | Running `next build` while `next dev` is serving corrupts the shared `.next` (client chunks 404 → hydration silently dies; buttons do nothing). Hit twice on 2026-07-04/05. | Rule: stop the dev server before `pnpm --filter @ur/web build`, or clean-restart dev (`rm -rf apps/web/.next && pnpm dev`) after. Recorded in CHANGELOG Technical + RELEASE_CHECKLIST awareness. |
| AG-1 | No git remote configured — commits were local-only, no off-machine backup. | 2026-07-05 — private repo created (`gh repo create`) under the founder's personal account; both `main` and `fix/responsive-persistence-ux` pushed with upstream tracking to `github.com/fawaskoya/royal-game-of-ur`. |
