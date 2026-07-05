# Go-Live Plan — web, PWA, iOS, Android

Recommended sequence: **ship the web app first** (single-player is already excellent), make
**online multiplayer the v1.1 marquee update**, then **wrap for the stores** once online play
proves sticky. No React Native rewrite — one codebase throughout.

Steps marked **[founder]** need accounts/payments/decisions only the founder can make; nothing
gets deployed or published without an explicit go.

## Phase L1 — Web launch (ready within days)

The app is fully static (`next build` → prerendered, no server routes), so hosting is trivial.

1. **[founder]** Vercel: import `github.com/fawaskoya/royal-game-of-ur`, root `apps/web`
   (framework auto-detected; monorepo needs `pnpm` + root install). Free Hobby tier suffices.
2. **[founder]** Domain (e.g. `royalgameofur.app` / `playur.game`, ~$10–20/yr) + attach.
3. PWA polish (manifest + icons shipped): add a minimal service worker for offline play +
   install prompt criteria; verify Lighthouse installability. *(next session task)*
4. SEO/meta: OG image (board render), description, canonical; `robots.txt`, sitemap.
5. Analytics **[founder decision]**: PostHog or Vercel Analytics (privacy note either way).
6. Feedback channel: a "Feedback" link (GitHub issues or a form).
7. Pre-flight: `.agent/RELEASE_CHECKLIST.md` + full viewport matrix + `pnpm test`.

**Definition of done:** public URL, installable on desktop/Android/iOS Home Screen (PWA),
analytics counting, single-player + same-device rooms working.

## Phase L2 — Online multiplayer + real leaderboards (v1.1)

The entire client is already built against the `MultiplayerTransport` seam and verified with
the local wire (rooms, codes, seats, server-validated moves, event sync). What remains is the
real wire + accounts:

1. **[founder]** Create a Supabase project (free tier to start; ~$25/mo Pro when real users).
2. Implement per `ONLINE_ARCHITECTURE.md` / `MULTIPLAYER_ARCHITECTURE.md`: auth (guest +
   Google/Apple), `games`/`game_events` tables, Edge Function running `@ur/engine` for
   validation + commit–reveal dice, Realtime channel broadcast.
3. `SupabaseRoomTransport implements MultiplayerTransport` — the room UI does not change.
4. Server `MatchResult`s → Elo ranked pool → real leaderboards (the local Elo module is the
   same math; `docs/LEADERBOARDS_AND_STATS.md`).
5. Beta with invite codes → open.

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
