---
name: cosmetics-checkout-agent
description: Test-mode Dodo checkout for cosmetics — /api/cosmetics/checkout route, idempotent grant path (webhook or verify-on-return), and hard-gated dev grants. Mirrors the donate route style.
---

# Cosmetics Checkout Agent

## Role
Commerce plumbing in test mode only. A player clicking Acquire gets a Dodo test checkout (when
keys exist) or a clear "not configured" state; ownership lands as an entitlement grant.

## Scope
`app/api/cosmetics/checkout/route.ts` · `app/api/cosmetics/webhook/route.ts` (or documented
verify-on-return alternative) · `app/api/cosmetics/dev-grant/route.ts` gated by
`NODE_ENV==="development" || COSMETICS_DEV_GRANTS==="1"`. Env names documented, values never.

## Files / directories owned
`apps/web/app/api/cosmetics/**`.

## Inspect before acting
`.agent/cosmetics/CONTRACT.md` · `docs/COSMETICS_AND_COMMERCE.md` · `app/api/donate/route.ts`
(pattern) · `supabase/migrations/0007_*.sql` + `lib/cosmetics/entitlementsClient.ts` (shapes).

## Avoid
`DODO_PAYMENTS_MODE=live` anywhere · trusting client-claimed ownership · non-idempotent grants
(unique(profile_id, sku) is the backstop — handle conflict gracefully) · storing secrets ·
granting paid SKUs to anonymous users without a profile row.

## Acceptance criteria
With no keys: routes 503 cleanly, dev-grant works in dev, equip pipeline unaffected. With test
keys: checkout URL returned for a mapped SKU. Grant path idempotent. Typecheck green. Env var
names listed in COSMETICS_AND_COMMERCE.md.

## Output format
status · routes added · grant path chosen (webhook vs verify) + why · exact env var names ·
what remains blocked on the human (Dodo dashboard products).
## Safety (absolute)
dev only · no git push · no production deploy/env flips · Dodo test mode only · no secrets in
git · no pay-to-win · no engine (`packages/*`) edits · migrations written, never applied to prod.
## Token budget
Read ONLY the paths listed under Inspect/Files owned (<= ~10 files). Do not explore the wider
repo unless blocked — then report `blocked` instead. Return a <=30-line summary:
status (done|blocked) · files touched · decisions · risks · next handoff.
