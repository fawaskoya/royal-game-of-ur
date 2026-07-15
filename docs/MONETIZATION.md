# Monetization plan

Core play stays free: no ads, no pay-to-win, server dice and Elo stay fair for everyone.

## Status (2026-07-11)

- Custom domain (`royalgameofur.app`) is live.
- **Dodo Payments** KYC approved; live tips enabled.
- **Homepage Donate**: soft nudge + **Donate** button opens panel → Dodo short link
  `https://dodo.pe/support-ur` (override with `NEXT_PUBLIC_DONATE_URL`).
- Product: one-time PWYW “Support the game” — product id `pdt_0NiwDp1XRBfPhen9b4102`.
- Full checkout URL (with return `/?donated=1`): see `apps/web/lib/donate.ts`.
- Return from Dodo shows a brief thank-you line on the homepage.
- Optional later: Checkout Sessions API (`DODO_PAYMENTS_API_KEY` + `DODO_PAYMENTS_PRODUCT_ID` +
  `DODO_PAYMENTS_MODE=live`) for in-app Tea/Offering/Patron amounts without leaving to a fixed link.

Code: `apps/web/lib/donate.ts`, `apps/web/components/SupportPanel.tsx`, `apps/web/components/GameApp.tsx`,
`apps/web/app/api/donate/route.ts`.

## Store status (2026-07-15 — SHIPPING to production; single $1.99 unlock-all)

The cosmetics system is BUILT and running on the dev server; nothing is deployed:

- **Atelier** panel in the menu: Boards | Dice | Pieces | Flair, swatch previews, equip,
  locked states with prices. 20 SKUs per `docs/COSMETICS_CATALOG.md`.
- Skins are pure CSS token overrides behind `data-*-skin` attributes on `<html>`
  (`CosmeticsEffect`), so every surface reskins at once; free defaults render when no
  attribute is set. Loadout persists in `ur:cosmetics` (versioned localStorage).
- Commerce (Route A per `docs/COSMETICS_AND_COMMERCE.md`): `/api/cosmetics/checkout`
  (Dodo TEST mode only — refuses live), verify-on-return is an honest 501 pending Dodo
  dashboard confirmation (§9), dev grants hard-gated to development.
- Server ownership: migration `0007_cosmetics_entitlements.sql` WRITTEN, **not applied** to
  any database; `profiles.flair` column for the one shared cosmetic.

Human-only steps to sell for real: verify Dodo business, create the 4 tier products, set
`DODO_COSMETICS_PRODUCT_MAP` + apply 0007, confirm Dodo session-retrieve API for verify,
then the explicit production unlock phrase.

### Pricing model (final, 2026-07-15)
One product: **Unlock All Cosmetics — $1.99** (every sku with priceUsd != null; Excavation
Finds remain earned-only). Grant path: Dodo webhook `payment.succeeded` (Standard Webhooks
signature) → upsert one entitlement row per sellable SKU (idempotent by PK). Return-URL
`status` is untrusted; the client only *polls* entitlements after redirect.

Founder steps to open the Store for real money:
1. Dodo dashboard → create ONE product: "Royal Game of Ur — Unlock All Cosmetics", one-time,
   $1.99 → copy its product_id.
2. Dodo dashboard → Developer → Webhooks → add endpoint
   `https://royalgameofur.app/api/cosmetics/webhook` → copy the signing secret (whsec_…).
3. Hand both to the agent → Vercel envs `DODO_COSMETICS_PRODUCT_ID`, `DODO_WEBHOOK_SECRET`,
   and `DODO_PAYMENTS_MODE=live` → redeploy. Until then the Store CTA answers
   "isn't open yet" (503) and nothing can be charged.

## Later — cosmetics (not power)

Sell presentation only; never affect dice, matchmaking, or legality.

1. **Board skins** — museum wood, night lapis, parchment, seasonal.
2. **Dice skins** — bone, obsidian, gold-inlaid tetrahedra.
3. **Piece skins** — ivory / basalt / gem accents.
4. **Profile flair** — handle frame, badge (cosmetic ranks from seasons).

Suggested stack: MoR checkout + Supabase `entitlements` (profile_id, sku, granted_at); client reads owned SKUs and applies CSS themes.

## Principles

- Ranked & casual ladders never gated by payment.
- Guests can still play.
- Cosmetic purchases never alter RNG or engine rules.
