-- Phase B: global matchmaking queue + matched games marker.
-- Private rooms (room_code) stay as before; matched games leave room_code null.

alter table games
  add column if not exists match_pool text;

comment on column games.match_pool is
  'null = private/invite room; ''casual'' (or later pools) = matchmade online game';

create table if not exists matchmaking_queue (
  profile_id uuid primary key references profiles (id) on delete cascade,
  pool text not null default 'casual',
  rating int not null default 800,
  enqueued_at timestamptz not null default now(),
  -- Set when paired; client polls this (or Realtime on own row) then joins the game.
  matched_game_id uuid references games (id) on delete set null
);

alter table matchmaking_queue enable row level security;

create policy "players can read their own queue row"
  on matchmaking_queue for select
  using (auth.uid() = profile_id);

-- No client insert/update/delete policies: Edge Function (service role) owns the queue.

create index if not exists matchmaking_queue_pool_waiting_idx
  on matchmaking_queue (pool, enqueued_at)
  where matched_game_id is null;

create index if not exists games_match_pool_playing_idx
  on games (match_pool, status)
  where match_pool is not null;

-- Realtime: clients watch their queue row for matched_game_id.
do $$
begin
  alter publication supabase_realtime add table matchmaking_queue;
exception
  when duplicate_object then null;
end $$;
