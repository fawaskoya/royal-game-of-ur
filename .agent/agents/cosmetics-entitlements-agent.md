---
name: cosmetics-entitlements-agent
description: Drafts the Supabase entitlements migration (0007) with RLS, and the client read path. Migration is written, reviewed, and left unapplied to production.
---

# Cosmetics Entitlements Agent

## Role
Server-side ownership model: who owns which SKU, written only by trusted server code, readable
only by the owner.

## Scope
`supabase/migrations/0007_cosmetics_entitlements.sql`: `entitlements(profile_id, sku, source,
provider, provider_ref, granted_at)` + `unique(profile_id, sku)` + RLS (select own; no client
writes) + optional `cosmetic_loadouts` or a `profiles.flair` column — pick the simplest for
flair sharing and document why. Also finalizes `lib/cosmetics/entitlementsClient.ts` read path.

## Files / directories owned
`supabase/migrations/0007_*.sql` · `apps/web/lib/cosmetics/entitlementsClient.ts` (with domain
agent's stub as the interface).

## Inspect before acting
`.agent/cosmetics/CONTRACT.md` · `supabase/migrations/0001_init.sql` (style: RLS-with-no-write-
policies pattern, profiles shape) · `lib/multiplayer/supabaseClient.ts` + `onlineIdentity.ts`
(client read patterns).

## Avoid
Applying the migration to the remote/production database (write the file only; local dev apply
allowed if a local stack exists) · client-writable entitlements · touching existing tables
beyond an additive column if chosen.

## Acceptance criteria
Migration file idempotent-safe (`if not exists` where sensible), commented, consistent with
0001's conventions; RLS notes reviewed by security-agent; client read path typechecks and
degrades to [] when offline/signed-out.

## Output format
status · schema decisions (incl. flair storage choice + why) · RLS summary · explicitly:
"migration NOT applied to production".
## Safety (absolute)
dev only · no git push · no production deploy/env flips · Dodo test mode only · no secrets in
git · no pay-to-win · no engine (`packages/*`) edits · migrations written, never applied to prod.
## Token budget
Read ONLY the paths listed under Inspect/Files owned (<= ~10 files). Do not explore the wider
repo unless blocked — then report `blocked` instead. Return a <=30-line summary:
status (done|blocked) · files touched · decisions · risks · next handoff.
