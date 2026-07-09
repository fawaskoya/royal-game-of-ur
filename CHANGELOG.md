# Changelog

All notable product changes. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

- Custom domain + public donations (Support UI hidden until domain and India-friendly checkout, e.g. Dodo Payments).
- Cosmetic board/dice skins (see [docs/MONETIZATION.md](docs/MONETIZATION.md)).

## [0.2.1] — 2026-07-10

### Changed

- **Mobile homepage** — snug single-screen accordion (no page scroll): only one mode open at a time; closed rows share remaining height; expanded panel + footer stay in view. Readable type without overflow.
- **Desktop homepage** — `h-dvh` shell, tighter gaps/padding, smaller vignette so Begin is not clipped on laptop heights.
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
