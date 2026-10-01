# Royal Game of Ur

The definitive digital version of the world's oldest playable board game (c. 2600 BCE) — historically authentic rules, honest AI, verified replays, online rooms, global matchmaking, and a real Elo ladder.

**Play:** [royalgameofur.app](https://royalgameofur.app) · **Rules guide:** [royalgameofur.app/how-to-play](https://royalgameofur.app/how-to-play)  
**Vision:** [docs/MASTER_SPEC.md](docs/MASTER_SPEC.md) · **Changelog:** [CHANGELOG.md](CHANGELOG.md)

## Status

| Piece | State |
| --- | --- |
| `@ur/engine` — deterministic Finkel rules, variants, verified replay | ✅ tested |
| `@ur/ai` — beginner → master expectimax ladder (never cheats) | ✅ tested |
| `@ur/cli` — demo / sim / bench | ✅ |
| `@ur/web` — Next.js client (local + online) | ✅ live on Vercel |
| Private online rooms (4-letter codes, server dice) | ✅ |
| Global casual matchmaking + email/anonymous accounts | ✅ |
| Server Elo leaderboard (W–L, win%, last active) | ✅ |
| Interactive tutorial (to bear-off) | ✅ |
| Homepage with self-playing attract board; viewport-fit desktop + mobile | ✅ |
| The Store — 20 cosmetics, one $1.99 unlock (Dodo Payments) | ✅ live — [catalog](docs/COSMETICS_CATALOG.md) |
| Route overlay (start → exit) in every mode, with a Settings switch | ✅ |
| Opening coach — tips on a new player's first three moves | ✅ |
| Daily challenge — one shared puzzle per UTC day, streaks | ✅ |
| Share-a-game links (whole game in the URL, no server) | ✅ |
| Post-game analysis, key moments, capture of the day | ✅ |
| Achievements (20, derived from local data) | ✅ |
| SEO + content pages: how-to-play, strategy (data-backed), history, printable board, about, contact, privacy, terms, refunds | ✅ — [docs/SITE_AND_LEGAL.md](docs/SITE_AND_LEGAL.md) |
| Custom domain + donations | ✅ Donate on homepage → Dodo (`dodo.pe/support-ur`) |

## Quickstart

```bash
pnpm install
pnpm test              # engine + ai + web unit tests
pnpm --filter @ur/web typecheck
pnpm dev               # web client → http://localhost:3000
pnpm demo              # narrated terminal game
pnpm stats             # regenerate the strategy guide's statistics (seeded, ~4 min)
```

### Local web env (online play)

Copy keys into `apps/web/.env.local` (never commit):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
SUPABASE_SECRET_KEY=sb_secret_…   # server/tooling only; not required for client play
```

Enable **Anonymous** and **Email** providers in Supabase Auth. Without env, single-player and same-device rooms still work.

### Supabase (linked project)

```bash
export SUPABASE_ACCESS_TOKEN=sbp_…   # account access token, not the project secret
npx supabase db push --linked
npx supabase functions deploy game-move --project-ref YOUR_REF
```

Migrations live under `supabase/migrations/` (`0001` … `0006`).

### Deploy web

```bash
# from repo root (Vercel Root Directory = apps/web)
vercel deploy --prod --yes
```

## Performance guardrails

The game must stay fast. Before merging web changes, run `pnpm --filter @ur/web build` and compare the `/` row's **First Load JS** with the previous build (currently **~175 kB**; content pages ~106 kB in the table, ~116 kB real gzipped download). Note the build table can under-count: it once hid a sitewide 60 KB Supabase import, so when in doubt measure the scripts a built page actually references.

- **Supabase is never in first load.** `lib/multiplayer/supabaseClient.ts` loads `@supabase/supabase-js` on demand (`getSupabase()`); never import it as a value anywhere else (types only).
- **Only the menu is in the homepage bundle.** Play screens and menu panels are `next/dynamic`; play screens are prefetched on idle.
- Analysis and the daily puzzle compute only when opened; the opening coach searches only on a new player's first three moves.
- System font stacks only: no web-font downloads.

## Structure

```
packages/engine    Pure rules. Zero UI. Every client move goes through here.
packages/ai        Agents + difficulty ladder + match runner.
apps/cli           Terminal demo / sim / bench.
apps/web           Next.js 15, React 19, Tailwind 4, Framer Motion.
supabase/          SQL migrations + game-move Edge Function.
docs/              Specs, architecture, UI, roadmap, ADRs.
```

## Documentation

| Doc | Purpose |
| --- | --- |
| [CHANGELOG.md](CHANGELOG.md) | Release notes |
| [MASTER_SPEC.md](docs/MASTER_SPEC.md) | Product vision |
| [GAME_RULES.md](docs/GAME_RULES.md) | Rules as implemented |
| [MATCHMAKING.md](docs/MATCHMAKING.md) | Casual pool + accounts |
| [ONLINE_ARCHITECTURE.md](docs/ONLINE_ARCHITECTURE.md) | Server-authoritative multiplayer |
| [LEADERBOARDS_AND_STATS.md](docs/LEADERBOARDS_AND_STATS.md) | Ladder + local stats |
| [MONETIZATION.md](docs/MONETIZATION.md) | Donate (Dodo) + future cosmetics |
| [GO_LIVE_PLAN.md](docs/GO_LIVE_PLAN.md) | Web → stores sequencing |
| [SITE_AND_LEGAL.md](docs/SITE_AND_LEGAL.md) | SEO pages, legal text, owner review checklist |
| [ROADMAP.md](docs/ROADMAP.md) · [TASKS.md](docs/TASKS.md) | Phases and backlog |
| [docs/adr/](docs/adr/) | Architectural decisions |

## Engineering invariants

1. **The engine is law.** Legality, captures, rosettes, and wins live only in `@ur/engine`.
2. **Determinism.** Dice are inputs. Same events ⇒ same state — replays and server authority depend on it.
3. **Immutability.** `GameState` is frozen plain data; transitions return new state.
4. **Server rolls online dice.** Clients never invent multiplayer rolls; Edge Function validates every move.
5. **No pay-to-win.** Future cosmetics never alter rules or RNG.

## License

Private / all rights reserved unless otherwise stated.
