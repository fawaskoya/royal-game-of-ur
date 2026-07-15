# Changelog

All notable product changes. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

- **The Store** (renamed from Atelier) — cosmetics wardrobe with live preview: 20 skins across boards/dice/pieces/flair; **one $1.99 purchase unlocks everything sellable, forever** (Excavation Finds stay earned-only). Try-before-you-buy previews for locked skins. Purchases ride the existing Dodo Payments rails: signed webhook (`payment.succeeded`, Standard Webhooks HMAC) is the sole grant authority; return-URL params are never trusted.

- **Pieces now walk their route** — every move travels square-by-square along the actual track (no more straight-line "teleports" that cut diagonally across the board); hovering a move shows breadcrumb dots along its path. Honors reduced-motion.
- **Tutorial: see the road** — the learner's full route is drawn on the board (directional chevrons, start ring, home marker), with a new intro step explaining the track's shape.
- **Tutorial: no more missed rolls** — the guide's turns are split into separate narrated beats with a dwell ("The guide rolls a 4… lands on the rosette… rosettes grant another roll… and it's a 3"), directly fixing the pacing confusion reported on Reddit.

- **Donate on homepage** — soft nudge + **Donate** button (mobile + desktop); panel opens Dodo short link `https://dodo.pe/support-ur`; thank-you line after `?donated=1`.
- **Atelier (dev only, not deployed)** — cosmetics wardrobe: 20 skins across boards/dice/pieces/flair (free Museum Classics + Royal Treasury et al.), equip pipeline via CSS token overrides, dev-grant testing path, Dodo test-mode checkout scaffolding. See [docs/COSMETICS_CATALOG.md](docs/COSMETICS_CATALOG.md) & [docs/COSMETICS_AND_COMMERCE.md](docs/COSMETICS_AND_COMMERCE.md).

## [0.2.2] — 2026-07-10

### Fixed

- **Homepage attract board** — the self-playing board is back on desktop (a short-viewport rule was hiding it on ordinary laptops), a touch larger, with a richer shadow; and it now plays from the first frame instead of sitting empty for a beat.
- **Mobile board** — bottom row of tiles no longer clipped by the frame in-game and in the tutorial (single-axis contain-fit; no more subpixel overflow).
- **Find a match** — account no longer flashes "Not connected"; returning players see their name instantly (cached + prewarmed), and the cold first connect reads "Connecting…".

## [0.2.1] — 2026-07-10

### Changed

- **Mobile homepage** — snug single-screen accordion (no page scroll): only one mode open at a time; closed rows share remaining height; expanded panel + footer stay in view. Readable type without overflow.
- **Desktop homepage** — `h-dvh` shell, tighter gaps/padding, smaller vignette so Begin is not clipped on laptop heights.
- **Mobile in-game** — portrait flank layout (Dark | board | Light), larger board, compact dice/roll footer; same for tutorial + online rooms.
- **Tutorial** — coach banner above dice; sound effects on roll/move/capture/rosette/win.
- **Desktop horizontal** — dice tray wraps; Roll no longer overflows the sidebar card.
- Support / tips UI remains **hidden** until custom domain + India-friendly checkout.

## [0.2.0] — 2026-07-10

### Added

- **Global matchmaking** — casual Elo pool; guests or email accounts; Edge actions `enqueue_match` / `poll_match` / `cancel_match`.
- **Accounts** — anonymous play + email sign-up/sign-in; upgrade guest without losing uid/ratings.
- **Interactive tutorial** — live board path through capture, rosette, and bear-off.
- **Richer leaderboard** — rank, Elo, W–L, win%, last active; server `wins`/`losses` on finish.
- **Mobile homepage** — single-screen compact shell with accordion mode cards.
- Migrations `0005_matchmaking`, `0006_ratings_detail`; production Vercel + Supabase deploy path.

### Changed

- Capture animations use overlay pieces (no remount flash).
- Menu polish: Learn to play / Find a match entry points; production env keys synced.
- Support / tips UI **hidden** pending custom domain and non-Stripe donation setup (India).

### Fixed

- Tutorial dice occlusion; homepage layout clipping on short viewports.
- Private rooms remain available alongside matchmaking.

## [0.1.0] — 2026-07-08

### Added

- `@ur/engine` Finkel rules, verified replays, event log.
- `@ur/ai` difficulty ladder (beginner → master).
- Web client: PvP, vs AI, AI vs AI, local rooms, persistence, stats, archive.
- Online private rooms (Supabase Auth anonymous, Edge `game-move`, Realtime).
- Server Elo on finished online games; handles; rematch.
