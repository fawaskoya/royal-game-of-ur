# Known Issues

Status: Open | In Progress | Mitigated | Resolved

## Open

| ID | Issue | Impact | Plan |
|----|-------|--------|------|
| AG-4 | No lint script configured (`pnpm lint` doesn't exist). | Style drift risk. | Don't invent commands (founding prompt). Consider adding ESLint in a devops loop; until then typecheck + tests are the gate. |
| AG-5 | Tile squareness in fit mode is approximate (frame `aspect-ratio` includes padding/gaps, so tiles deviate a few % from square). | Cosmetic only. | Accepted; revisit if a texture pass makes it visible. |
| AG-6 | Dev-only `?layout=` override bypasses touch auto-orientation. | Could confuse if shared in a URL. | Test-only by convention; remove or gate if it causes confusion. |
| AG-7 | In-game `motion.button` layout animations run under `MotionConfig reducedMotion="user"`, but the win overlay uses opacity/scale — verify full reduced-motion coverage in the a11y pass. | A11y. | Phase 3 UI loop checks `prefers-reduced-motion`. |
| AG-11 | Vercel production deploys are manual (`vercel --prod`) — the GitHub repo isn't connected for auto-deploy-on-push. | New commits don't go live until someone runs the deploy command. | Founder step: Vercel → Settings → Git → Connect (authorizes the Vercel GitHub App — an OAuth grant only the founder can approve). |
| AG-16 | Player handles are freely editable with no moderation (length-capped 2–24 only). | Offensive names could appear on the public leaderboard. | Acceptable at beta scale; add a blocklist/report path before promoting the leaderboard broadly. |
| AG-17 | The in-browser online win path (rematch buttons, rating note, local recording) is verified by unit tests + the scripted backend game, not by a human-driven full game in the UI. | Low — the wiring reuses verified patterns. | Confirm end-to-end on the first real finished online game; remove this row after. |
| AG-15 | Edge Function cold starts add 1–3 s to the first action after idle (Sydney region); the transport retries once and shows "server waking up". | Occasional sluggish first roll. | Acceptable for beta; revisit with function warmers or a region move if it annoys real users. |

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
| AG-9 | Supabase backend was written but unverified — this environment can't complete `supabase login`'s browser OAuth flow. | 2026-07-08 — founder generated a Personal Access Token; CLI authenticated via `SUPABASE_ACCESS_TOKEN`, migration applied, function deployed, verified end-to-end (see AG-13). |
| AG-10 | `game-move` Edge Function's `sloppy-imports` approach for `@ur/engine`'s extensionless internal imports was unverified. | 2026-07-08 — it did not work: the Supabase CLI's own asset-walker resolves imports literally before Deno's bundler runs, so it failed on the missing extensions regardless of the config. Fixed with the documented fallback: `esbuild --bundle` produces one dependency-free file (`engine.bundle.ts`), which deploys cleanly. |
| AG-13 | `game_secrets.seed`/`rng_state` were `int4`, but a uint32 crypto-random seed (or mulberry32's evolving state) can exceed its signed range. | Found by the first live end-to-end test (`create_room` failed on a real out-of-range seed). 2026-07-08 — widened both columns to `bigint` (migration `0002_secrets_bigint.sql`); re-tested clean including a full roll/move/negative-test pass. |
| AG-14 | Online games weren't recorded locally and had no rematch flow. | 2026-07-10 — once-per-game MatchResult + archive entry (`mode: online`, opponent handle) in useOnlineRoom; server-side `rematch` action (migration `0004`) with seats swapped and idempotent convergence (verified: simultaneous requests → one game); win overlay gains Rematch/Join rematch + fresh-rating note. |
| AG-18 | Engine replay verifier rejected valid logs after a jsonb round-trip: capture objects were compared via `JSON.stringify`, and Postgres jsonb canonicalizes key order. First seen on the first online game containing a capture — the server refused its own stored log. | 2026-07-10 — field-by-field comparison in `buildStateFromEvents` + regression test that replays a full game through simulated jsonb key reordering; engine bundle regenerated and redeployed. |
| AG-12 | `SupabaseRoomTransport` was verified by script but unreachable from the UI. | 2026-07-09 — `useOnlineRoom` + online/same-device flows in `OnlineRoomView` (shared `RoomGameScreen`); verified live in the browser against a separate-account scripted guest (room DEWN, bidirectional Realtime sync). Two launch blockers found and fixed en route: CORS preflight rejected supabase-js's `apikey`/`x-client-info` headers, and `games`/`game_events` weren't in the `supabase_realtime` publication (migration `0003_realtime.sql`). |
