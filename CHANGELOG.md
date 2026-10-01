# Changelog

All notable product changes. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

- **The road is now drawn in every mode.** Players told us they couldn't follow the path; the tutorial's route overlay (start ring, direction chevrons, double-chevron exit) now appears in vs-machine, two-player, private-room, find-a-match and watch games too. It shows *your* route (your seat online, the human side vs the AI, whoever is on turn in pass-and-play). New **Show the route** switch in Settings (on by default).
- **Opening coach.** A new player's first three moves get a plain-English tip ("land on the rosette for a free extra roll") with the suggested move ringed on the board. Built from the hint engine's tags, so it never invents advice; stops after three games. **Opening tips** switch in Settings.
- **Daily challenge.** One position per UTC day, identical for every player and generated from the date alone (no server). Pick a move, get a ★ rating against the hint engine's ranking and an explanation of the best move; first answer of the day counts; streaks tracked.
- **Share a game.** A finished game is encoded into ~100 bytes of URL (dice faces + piece indices; the engine re-derives everything else), so **Share** works with no upload and links never expire. A tampered link fails to decode instead of producing an illegal game. Available on the win screens and in the replay viewer.
- **Capture of the day** in Replays: the hardest hit from your last 24 hours of games (or on record), one tap to watch it.
- **Achievements** (20), derived from data already on the device — beat each tier, streaks, flawless wins, rosette riders, daily streaks, an online win. Announced on the win screen; list under Stats.
- **Ladder: Season 1** framing — the September database reset is now explained instead of looking like an empty ladder.
- **New pages for search and payment-provider review:** `/how-to-play` (full Finkel rules guide + FAQ structured data), `/about`, `/contact`, `/privacy`, `/terms`, `/refunds`; sitemap updated; footer links. Legal wording is a first draft pending owner review — see docs/SITE_AND_LEGAL.md.
- **Contact** address in the menu footer (desktop + mobile), Settings, and the contact page.
- **Faster to start, not slower:** menu panels now load on demand; first-load JS for the game page went from 259 kB to ~257 kB despite all of the above. A 25-second AI-vs-AI soak showed zero long main-thread tasks.

- **Online play is roughly 3x faster again.** Measured from India, the worst case for a European backend: a roll went from 1841 ms to **579 ms** and a move from 1281 ms to **559 ms**; European players will see considerably better. Four changes — the game server now runs in the database's own region (it had been running near each *player*, which sounds faster and meant crossing to Frankfurt twice per action instead of once), a roll commits its dice in a single database round trip instead of two, the roll request is sent the moment your turn begins rather than when you tap (rolling isn't a choice in Ur, so the wait can happen behind the dice animation), and a scheduled ping keeps the server warm so the first player after a quiet spell doesn't wait for it to wake.

- **Online play moved to a European server — and it is dramatically faster.** The backend had been sitting in Sydney, which was close to nobody: measured from Vercel's own datacentres, a single database round trip from Frankfurt to Sydney took **~950 ms**, and from the US **~680 ms**. It now runs in `eu-central-1`, where the same round trip is **~46 ms from Europe** and **~308 ms from the US**. Combined with cutting the number of round trips each action makes (a roll went from six to three), a European player's roll drops from roughly **5.8 s to ~220 ms**, and an American player's from ~4.2 s to ~1.0 s. Region chosen from real traffic — Europe 571 visitors and the Americas 436 over 30 days, against 51 in India.
- **Rejoining a private room by code now works.** Previously the code stopped resolving the moment your opponent joined, so a refresh locked you out of a live game permanently.
- Fresh database: all accounts, ratings and ladder history reset. No purchases existed, so nothing paid was lost.

- **Online rooms: dead clocks and lost games fixed.** Three bugs in the turn-clock/trust layer, each reproduced against production. (1) If you made a private room and waited more than two minutes for your friend to join, **your clock was already at 0:00** the moment the game began — it was counting from when you created the room, not from when the game started. (2) Your own rolls and moves never reset your own clock, so a roll-then-move turn got one 120-second budget instead of one per action, and a rosette chain never reset at all — the clock showed less time than you actually had. (3) **Reloading the page ended the game for you**: the room code stopped working the instant your opponent joined, and there was no other way back in, so a refresh or a phone backgrounding the tab meant losing on time. Online games are now remembered, and a **Rejoin your game** card appears in both online lobbies; the room code also works as a rejoin token once the server function is redeployed.

- **Online trust — resign, turn clocks, abandonment forfeit.** Live games now have a **Resign** button (two-tap confirm; counts as a normal rated loss), a **2-minute per-turn clock** shown as a countdown, and — when an opponent's clock runs out — a **"Claim the win"** button. Every ending is server-verified: the clock anchor is the last move's server timestamp, so no client can fake a timeout, and resign/timeout are rated exactly like an on-board finish. No more games stuck forever because someone closed their tab.

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
