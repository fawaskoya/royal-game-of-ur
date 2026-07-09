-- Rematch: the finished game points at its successor. Both players are
-- already subscribed to the old row's UPDATEs, so setting this is also the
-- signal ("your opponent wants a rematch") — no extra channel needed.
alter table games
  add column if not exists rematch_game_id uuid references games (id);

-- Handles become visible on the leaderboard and editable by their owner
-- (existing RLS policy) — a hard length bound is the minimum hygiene.
alter table profiles
  drop constraint if exists profiles_handle_length;
alter table profiles
  add constraint profiles_handle_length
  check (handle is null or char_length(handle) between 2 and 24);
