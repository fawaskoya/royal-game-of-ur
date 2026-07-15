# Cosmetics Entitlements Loop

## Mission
Server ownership schema drafted and reviewed — entitlements table + RLS + flair sharing
decision — written as migration 0007 and NOT applied to production.

## Subagent assignment
`cosmetics-entitlements-agent`; `security-agent` reviews RLS before done.

## Parallelism
Wave 4, parallel with Loops 26 + 27.

## Inputs
CONTRACT ownership model · migration 0001 conventions · onlineIdentity client patterns.

## Files to inspect
`supabase/migrations/0001_init.sql` · `apps/web/lib/multiplayer/onlineIdentity.ts` ·
`apps/web/lib/cosmetics/entitlementsClient.ts` (domain stub).

## Steps
1. Write `supabase/migrations/0007_cosmetics_entitlements.sql`: table, unique(profile_id,sku),
   RLS select-own / no client writes, indexes; flair sharing = simplest viable (likely
   `profiles.flair text` additive column) with rationale comment.
2. Implement `entitlementsClient.ts` real read (RLS-gated select), offline -> [].
3. Security review: confirm no client write path, no PII expansion, leaderboard flair exposure
   is opt-in by equipping.

## Checks
Idempotent-safe DDL · comments explain the trust model · nothing executed against remote DB.

## Tests to run
`pnpm --filter @ur/web typecheck` (client) · SQL is review-only this sprint.

## Documentation to update
Notes destined for COSMETICS_AND_COMMERCE.md handed to docs loop.

## Git commit format
`feat(cosmetics): entitlements migration draft + client read`

## Done criteria
Migration reviewed; WAVE_LOG records "0007 written, NOT applied to production".
## Forbidden actions
Production deploy · `git push` · live payment mode · applying migrations to prod · secrets in
git · engine edits. Local commits allowed only when the loop's Done criteria pass.
