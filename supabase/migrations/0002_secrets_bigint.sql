-- Fix: `seed` and `rng_state` hold full uint32 values (0..4294967295 from
-- crypto.getRandomValues / mulberry32's internal state), which overflows
-- Postgres's signed `int4` (max ~2.1 billion). Widen to `bigint`. Caught by
-- the first live end-to-end test (create_room failed on a real random seed
-- above the int4 range) — see .agent/KNOWN_ISSUES.md.
alter table game_secrets
  alter column seed type bigint,
  alter column rng_state type bigint;
