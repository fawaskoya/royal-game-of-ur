-- Cosmetics entitlements (Atelier sprint, Wave 4).
--
-- ⚠ SPRINT SAFETY: this file is WRITTEN ONLY during the cosmetics sprint —
-- do not apply to the production database until the human gives the explicit
-- production unlock (see docs/FABLE5_COSMETICS_MEGA_PROMPT.md hard rules).
--
-- Trust model (same pattern as game_secrets in 0001): RLS is enabled with a
-- SELECT-own policy and NO insert/update/delete policies, so PostgREST
-- clients can never write — grants land only via trusted server code using
-- the service role (checkout verify / future webhook). A player therefore
-- cannot grant themselves a paid SKU: the client's "owned" set is display
-- logic, while the row here is the actual source of truth the server wrote.

create table if not exists entitlements (
  profile_id uuid not null references profiles (id) on delete cascade,
  -- SKU ids are the contract's `{category}.{snake_id}` strings
  -- (e.g. 'board.night_lapis'); bounded + shape-checked so junk can't land.
  sku text not null check (char_length(sku) between 6 and 64 and sku ~ '^(board|dice|piece|flair)\.[a-z0-9_]+$'),
  -- Where the grant came from: 'purchase' | 'dev' | 'achievement' | 'admin'.
  source text not null default 'purchase' check (source in ('purchase', 'dev', 'achievement', 'admin')),
  -- Payment provider bookkeeping (idempotency/audit); null for non-purchases.
  provider text,
  provider_ref text,
  granted_at timestamptz not null default now(),
  -- One row per (player, sku): re-granting is a harmless conflict, which is
  -- what makes the verify/webhook grant path idempotent by construction.
  primary key (profile_id, sku)
);

alter table entitlements enable row level security;

create policy "players read their own entitlements"
  on entitlements for select
  using (auth.uid() = profile_id);

-- No write policies on purpose — see trust model above.

-- Fast "all SKUs for player" is covered by the primary key; an index by
-- provider_ref helps the verify path look up "did we already grant this
-- order" without a table scan.
create index if not exists entitlements_provider_ref_idx
  on entitlements (provider_ref)
  where provider_ref is not null;

-- Shared flair: the ONE cosmetic other players can see (contract:
-- "Multiplayer v1" — board/dice/pieces are local presentation). A single
-- additive nullable column on profiles is the simplest correct shape:
-- profiles are already publicly readable (0001) and already carry the only
-- other shared identity field (handle), the own-profile UPDATE policy from
-- 0001 already lets a player set their own flair, and RLS on entitlements
-- still gates whether a PAID flair may be equipped (clients enforce via
-- resolveLoadout; a spoofed profiles.flair with an un-owned sku only ever
-- misdecorates the spoofer's own name — it grants nothing). A separate
-- cosmetic_loadouts table would add a join to every leaderboard/lobby read
-- to share exactly one value, with no security gain.
alter table profiles
  add column if not exists flair text
  check (flair is null or (char_length(flair) between 6 and 64 and flair ~ '^flair\.[a-z0-9_]+$'));
