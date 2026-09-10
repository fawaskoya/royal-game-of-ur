-- Atomic roll commit — append the roll's events and advance the dice RNG
-- cursor in ONE database round trip instead of two.
--
-- Latency is the motive: a round trip from the edge function to the database
-- costs ~46 ms from Europe and ~308 ms from the US, and a roll was making
-- three of them (batched reads, append, rng_state). This folds the last two
-- together, taking a roll to two.
--
-- It also strengthens a guarantee the old two-call version only approximated.
-- Previously, if the append lost a race on `seq` the rng_state update had
-- already been issued separately; the ordering made that unlikely but not
-- impossible. Inside one function both share a transaction, so a losing race
-- rolls back the cursor too. The dice sequence can no longer gain a gap, and
-- the commit-reveal check players can run against `seed_revealed` stays exact.
create or replace function commit_roll(
  p_game_id uuid,
  p_from_index int,
  p_events jsonb,
  p_rng_state bigint
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into game_events (game_id, seq, event)
  select p_game_id, p_from_index + (ord - 1)::int, value
  from jsonb_array_elements(p_events) with ordinality as t(value, ord);

  update game_secrets set rng_state = p_rng_state where game_id = p_game_id;
end;
$$;

-- Server-authority only: this writes the event log and the dice cursor, so no
-- client role may call it. The Edge Function holds the service key.
revoke all on function commit_roll(uuid, int, jsonb, bigint) from public;
revoke all on function commit_roll(uuid, int, jsonb, bigint) from anon;
revoke all on function commit_roll(uuid, int, jsonb, bigint) from authenticated;
grant execute on function commit_roll(uuid, int, jsonb, bigint) to service_role;
