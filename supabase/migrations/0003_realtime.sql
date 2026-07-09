-- Realtime: postgres_changes only fires for tables in the supabase_realtime
-- publication — without this, clients would connect and then hear nothing.
-- RLS still gates what each subscriber may receive (players of the game).
-- Idempotent: ALTER PUBLICATION ... ADD TABLE has no IF NOT EXISTS.
do $$
begin
  alter publication supabase_realtime add table game_events;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table games;
exception
  when duplicate_object then null;
end $$;
