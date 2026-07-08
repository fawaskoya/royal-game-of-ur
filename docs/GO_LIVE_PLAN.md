# Go-Live Plan — web, PWA, iOS, Android

Recommended sequence: **ship the web app first** (single-player is already excellent), make
**online multiplayer the v1.1 marquee update**, then **wrap for the stores** once online play
proves sticky. No React Native rewrite — one codebase throughout.

Steps marked **[founder]** need accounts/payments/decisions only the founder can make; nothing
gets deployed or published without an explicit go.

## Phase L1 — Web launch

The app is fully static (`next build` → prerendered, no server routes), so hosting is trivial.

**Done (2026-07-06/08):** Vercel project `royal-game-of-ur` created (CLI, `fawas-koyas-projects-cf4a5ddb`
scope), Root Directory set to `apps/web` (monorepo-aware), Deployment Protection disabled
**[founder]**, production deploy live and public.

Remaining:
1. **[founder]** Domain (e.g. `royalgameofur.app` / `playur.game`, ~$10–20/yr) + attach in
   Vercel → Settings → Domains.
2. **[founder, optional]** Connect the GitHub repo in Vercel → Settings → Git for auto-deploy on
   push (currently deploys are manual via `vercel --prod`) — needs authorizing the Vercel
   GitHub App, an OAuth-style grant only the founder can approve.
3. PWA polish (manifest + icons shipped): add a minimal service worker for offline play +
   install prompt criteria; verify Lighthouse installability.
4. SEO/meta: OG image (board render), description, canonical; `robots.txt`, sitemap.
5. Analytics **[founder decision]**: PostHog or Vercel Analytics (privacy note either way).
6. Feedback channel: a "Feedback" link (GitHub issues or a form).
7. Pre-flight: `.agent/RELEASE_CHECKLIST.md` + full viewport matrix + `pnpm test`.

**Definition of done:** public URL ✓, installable on desktop/Android/iOS Home Screen (PWA),
analytics counting, single-player + same-device rooms working ✓.

## Phase L2 — Online multiplayer + real leaderboards (v1.1)

The entire client is built against the `MultiplayerTransport` seam and verified with the local
wire (rooms, codes, seats, server-validated moves, event sync — `LocalRoomTransport`). The real
wire is now *written* against a real Supabase project, not yet deployed/verified:

**Done (2026-07-08):**
- Supabase project `royal-game-of-ur` created **[founder]** (`potentdream's Org`, Sydney region).
- Keys wired into Vercel (all environments) and a local `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
- `supabase/migrations/0001_init.sql`: `profiles`, `games`, `game_events`, `ratings`,
  `game_secrets` (server-only, RLS with zero policies — commit-reveal dice fairness).
- `supabase/functions/game-move/index.ts`: server-authoritative Edge Function (`create_room`,
  `join_room`, `roll`, `move`) — reconstructs state via `buildStateFromEvents`, validates
  through `@ur/engine`, appends events. Reads go through plain PostgREST + Realtime on
  `game_events` (RLS-gated), not this function.
- `apps/web/lib/multiplayer/{supabaseClient,supabaseTransport}.ts`: `SupabaseRoomTransport
  implements MultiplayerTransport`, guest identity via Supabase anonymous auth.

**Not done / blocked** — this repo had no Supabase CLI session when the above was written, so
**none of it has been deployed or run against a live database yet**:
1. **[founder]** Generate a Supabase Personal Access Token (dashboard → Account → Access
   Tokens) so the CLI can authenticate non-interactively (this environment can't complete the
   browser OAuth login flow it normally uses).
2. Apply the migration (`supabase db push` or paste `0001_init.sql` into the SQL Editor).
3. Deploy the function (`supabase functions deploy game-move`) — verify the `sloppy-imports`
   Deno config actually resolves `@ur/engine`'s extensionless internal imports; if not, vendor
   a bundled copy into `supabase/functions/_shared/engine.ts` (documented there).
4. **[founder]** Enable "Anonymous Sign-ins" in Dashboard → Authentication → Providers (off by
   default; guest identity depends on it).
5. End-to-end test: create a room from one browser/account, join from another, play a full
   game, confirm Realtime sync and that a tampered `move` payload is rejected.
6. Wire `SupabaseRoomTransport` into an online-aware version of the room UI (today
   `OnlineRoomView` only uses the local transport) and swap based on `isOnlineConfigured()`.
7. Server `MatchResult`s → Elo ranked pool → real leaderboards (the local Elo module is the
   same math; `docs/LEADERBOARDS_AND_STATS.md`).
8. Beta with invite codes → open.

## Phase L3 — App stores (v1.2)

**Capacitor** wraps the same static build into native shells:

| | Android | iOS |
|---|---|---|
| Account | **[founder]** Play Console, $25 once | **[founder]** Apple Developer, $99/yr |
| Wrap | Capacitor WebView (or TWA/Bubblewrap for a lighter PWA wrapper) | Capacitor WebView |
| Native niceties | haptics on capture/rosette, share sheet for replays | same + proper icon/splash |
| Review risk | low | "minimum functionality" rule — mitigate by shipping online play + Game Center-ish polish first (that's why L3 follows L2) |
| Assets | store listing, screenshots (the viewport lab makes these easy), privacy policy page | same |

Costs total: domain (~$15/yr) + Apple ($99/yr) + Play ($25 once) + Supabase ($0→25/mo).
Everything else is already built or free-tier.

## Sequencing rationale

- Web-first maximizes iteration speed; store review cycles would slow the multiplayer work.
- iOS review genuinely rejects thin wrappers — arriving with accounts, online rooms, and
  leaderboards clears the bar comfortably.
- PWA install covers "app on my phone" for early users at zero cost in the meantime.

## Already in place

Static build ✓ · PWA manifest + icons ✓ · responsive both orientations ✓ · persistence ✓ ·
archive/replays/analysis ✓ · room flow on the transport seam ✓ · local Elo ✓ · private repo ✓.
