-- Keep one Edge Function isolate warm.
--
-- A cold isolate costs the first player ~900 ms (measured). Traffic is light
-- enough that the function often goes cold between games, so the person who
-- opens a lobby after a quiet spell pays it. The client already prewarms on
-- lobby open (`prewarmGameServer`), which covers a player who is about to
-- act; this covers the gap before that, at 288 invocations a day.
--
-- The ping is deliberately unauthenticated: it gets a 401 back, which is
-- fine — booting the isolate and initialising the module is the whole point,
-- and it keeps a real credential out of a stored cron command.
--
-- Degrades quietly. If pg_cron or pg_net isn't available the migration still
-- succeeds and the client-side prewarm carries the load on its own.
do $$
begin
  create extension if not exists pg_cron;
  create extension if not exists pg_net;
exception when others then
  raise notice 'warm-up cron skipped — extensions unavailable: %', sqlerrm;
end $$;

do $$
begin
  perform cron.unschedule('warm-game-move');
exception when others then
  null; -- no existing job, or cron not installed
end $$;

do $$
begin
  perform cron.schedule(
    'warm-game-move',
    '*/5 * * * *',
    $cron$
      select net.http_post(
        url := 'https://fxavqkfpwmrvbvpidwaw.supabase.co/functions/v1/game-move',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{"action":"warm"}'::jsonb
      );
    $cron$
  );
exception when others then
  raise notice 'warm-up cron not scheduled: %', sqlerrm;
end $$;
