-- Leaderboard detail: wins / losses tracked server-side at game finish.
-- Existing rows keep games_played; wins/losses start at 0 and accumulate going forward.

alter table ratings
  add column if not exists wins int not null default 0,
  add column if not exists losses int not null default 0;

comment on column ratings.wins is 'Casual-pool wins (server-written on finish).';
comment on column ratings.losses is 'Casual-pool losses (server-written on finish).';
