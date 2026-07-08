-- Royal Game of Ur — online play schema (Phase A: private rooms).
-- Matches the data model in docs/ONLINE_ARCHITECTURE.md. Ranked/matchmaking
-- tables arrive in Phase B; this migration covers private rooms only.

-- One row per authenticated identity (including anonymous/guest sign-ins).
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text,
  country text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles are publicly readable"
  on profiles for select
  using (true);

create policy "users manage their own profile"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- One row per game. `ruleset` mirrors the engine's RulesetConfig exactly, so
-- buildStateFromEvents(ruleset, events) reconstructs any position.
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  room_code text unique, -- 4-letter invite code while the room is open; null once full/expired
  ruleset jsonb not null,
  light uuid references profiles (id),
  dark uuid references profiles (id),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished', 'abandoned')),
  winner smallint check (winner in (0, 1)),
  -- Commit-reveal dice fairness (docs/ONLINE_ARCHITECTURE.md): the server
  -- commits to a seed hash at creation and reveals the seed at game end so
  -- clients can independently re-derive every roll.
  seed_commitment text not null,
  seed_revealed text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

alter table games enable row level security;

create policy "players and the room creator can read their games"
  on games for select
  using (auth.uid() = light or auth.uid() = dark or status = 'waiting');

-- All writes to `games` and `game_events` go through the game-move Edge
-- Function using the service role (which bypasses RLS by design) — clients
-- never insert events directly, so there is no client-writable policy here.

-- Append-only event log — the single source of truth. Mirrors GameEvent
-- exactly (see packages/engine/src/types.ts); `seq` is the 0-based index
-- matching `state.history` / ProposedMove.afterEvent.
create table if not exists game_events (
  game_id uuid not null references games (id) on delete cascade,
  seq int not null,
  event jsonb not null,
  server_ts timestamptz not null default now(),
  primary key (game_id, seq)
);

alter table game_events enable row level security;

create policy "players can read events for their games"
  on game_events for select
  using (
    exists (
      select 1 from games
      where games.id = game_events.game_id
        and (games.light = auth.uid() or games.dark = auth.uid())
    )
  );

-- Training/ranked rating per pool (Elo now; see lib/rating/elo.ts for the
-- identical client-side math used locally). Empty until Phase B ranked play.
create table if not exists ratings (
  profile_id uuid not null references profiles (id) on delete cascade,
  pool text not null default 'casual',
  rating int not null default 800,
  games_played int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (profile_id, pool)
);

alter table ratings enable row level security;

create policy "ratings are publicly readable"
  on ratings for select
  using (true);

create index if not exists games_room_code_idx on games (room_code) where room_code is not null;
create index if not exists games_waiting_idx on games (status) where status = 'waiting';

-- Server-only: the actual dice seed and RNG cursor. RLS is enabled with NO
-- policies, so PostgREST/anon/authenticated roles get zero rows ever — only
-- the Edge Function (using the service role, which bypasses RLS) can read or
-- write this table. `games.seed_commitment`/`seed_revealed` are the public
-- fairness proof; this table is what makes the commitment meaningful.
create table if not exists game_secrets (
  game_id uuid primary key references games (id) on delete cascade,
  seed int not null,
  rng_state int
);

alter table game_secrets enable row level security;
