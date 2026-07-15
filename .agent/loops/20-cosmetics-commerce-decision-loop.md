# Cosmetics Commerce Decision Loop

## Mission
Choose the most efficient monetization route for cosmetics on this exact stack (India founder ->
Dodo MoR already live for tips; Supabase profiles; Next API routes) and write it down so
implementation agents never re-litigate it.

## Subagent assignment
`cosmetics-commerce-agent` (consult `product-agent` for pricing philosophy if needed).

## Parallelism
Runs in Wave 1 alongside Loop 21 (catalog). No shared files.

## Inputs
`.agent/cosmetics/CONTRACT.md` · `docs/MONETIZATION.md` · donate route shape.

## Files to inspect
`apps/web/app/api/donate/route.ts` · `docs/MONETIZATION.md` · CONTRACT commerce-lean section.

## Steps
1. Evaluate routes A (Dodo checkout sessions + entitlements), B (static links per SKU),
   C (bundles-first), D (tips only) against: India payouts, test-mode capability, effort,
   idempotent grants, guest UX.
2. Confirm or amend the CONTRACT's lean (amendments need explicit rationale).
3. Write `docs/COSMETICS_AND_COMMERCE.md`: chosen route, phased efficiency order (free/equip ->
   catalog/UI -> dev grants -> test checkout -> grants -> expand), env var names, webhook-vs-verify
   decision tree, human-only steps (Dodo product creation).
4. Update `docs/MONETIZATION.md` status section only.

## Checks
No env values anywhere; every claim about Dodo grounded in the donate route or marked
"verify in dashboard"; human-blocked items explicitly listed.

## Tests to run
None (docs loop).

## Documentation to update
`docs/COSMETICS_AND_COMMERCE.md` (new) · `docs/MONETIZATION.md`.

## Git commit format
`docs(cosmetics): commerce route decision`

## Done criteria
Route locked with rationale; checkout agent could start from the doc alone.
## Forbidden actions
Production deploy · `git push` · live payment mode · applying migrations to prod · secrets in
git · engine edits. Local commits allowed only when the loop's Done criteria pass.
