# Cosmetics Checkout Loop

## Mission
Test-mode purchase plumbing: checkout route per SKU, an idempotent grant path, and dev grants
so the whole pipeline works with zero payment configuration.

## Subagent assignment
`cosmetics-checkout-agent`; `security-agent` consulted on webhook trust if webhook chosen.

## Parallelism
Wave 4, parallel with Loops 25 + 27 (interface = entitlements shapes from CONTRACT).

## Inputs
COSMETICS_AND_COMMERCE.md route decision · donate route pattern · CONTRACT env names.

## Files to inspect
`apps/web/app/api/donate/route.ts` · `docs/COSMETICS_AND_COMMERCE.md` ·
`supabase/migrations/0007_*.sql` (shape) · `lib/cosmetics/catalog.ts` (sku validity).

## Steps
1. `POST /api/cosmetics/checkout { sku }`: validate sku against catalog, map to Dodo product
   (env/config map documented), create test Checkout Session, return url; 503 clean when
   unconfigured.
2. Grant path per commerce doc: webhook route (signature-verified, idempotent upsert) OR
   verify-on-return; document why.
3. `POST /api/cosmetics/dev-grant { sku }` gated by NODE_ENV/COSMETICS_DEV_GRANTS; grants into
   localStorage path via response the client applies (or entitlements when signed-in + local
   stack) — simplest honest dev flow, documented.
4. Never touch live mode; assert mode!=="live" defensively in code.

## Checks
No secrets committed · unmapped SKUs rejected · double-grant safe · donate route untouched.

## Tests to run
`pnpm --filter @ur/web typecheck` · curl the routes on dev (unconfigured 503 path at minimum).

## Documentation to update
Env var names + product-mapping how-to -> hand to docs loop.

## Git commit format
`feat(cosmetics): test-mode checkout + dev grants`

## Done criteria
Dev grant -> owned -> equippable works keyless end-to-end; with test keys a checkout URL is
returned.
## Forbidden actions
Production deploy · `git push` · live payment mode · applying migrations to prod · secrets in
git · engine edits. Local commits allowed only when the loop's Done criteria pass.
