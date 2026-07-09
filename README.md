# Royal Game of Ur

The definitive digital version of the world's oldest playable board game (c. 2600 BCE) — historically authentic rules, honest AI, verified replays, online rooms, global matchmaking, and a real Elo ladder.

**Play:** [royal-game-of-ur-zeta.vercel.app](https://royal-game-of-ur-zeta.vercel.app)  
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
| Compact mobile homepage | ✅ |
| Custom domain + donations | 📋 after domain (Support UI hidden) |
| Cosmetics (boards / dice) | 📋 planned — [docs/MONETIZATION.md](docs/MONETIZATION.md) |

## Quickstart

```bash
pnpm install
pnpm test              # engine + ai + web unit tests
pnpm --filter @ur/web typecheck
pnpm dev               # web client → http://localhost:3000
pnpm demo              # narrated terminal game
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
| [MONETIZATION.md](docs/MONETIZATION.md) | Tips later (India-friendly MoR) + cosmetics |
| [GO_LIVE_PLAN.md](docs/GO_LIVE_PLAN.md) | Web → stores sequencing |
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
