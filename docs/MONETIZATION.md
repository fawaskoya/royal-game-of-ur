# Monetization plan

Core play stays free: no ads, no pay-to-win, server dice and Elo stay fair for everyone.

## Status (2026-07-10)

- Custom domain (`royalgameofur.app`) is live.
- **Dodo Payments** selected as the Merchant of Record (works for individuals in India; Stripe/Buy Me a Coffee do not). Account created; business verification in progress.
- `apps/web/app/api/donate/route.ts` calls Dodo's Checkout Sessions API (`POST /checkouts`) directly — no SDK dependency, matching the rest of the app's style. Dodo requires an existing **Product** (no ad-hoc/inline pricing); the plan is **one "Pay what you want" product** so a single `product_id` serves all tip amounts (the Support panel's Tea/Offering/Patron/Custom buttons each pass a different `amount`).
- The **Support ♡** menu button stays hidden until either env below is set — a broken button is worse than no button:
  - `DODO_PAYMENTS_API_KEY` + `DODO_PAYMENTS_PRODUCT_ID` (+ `DODO_PAYMENTS_MODE=live` when ready — defaults to `test`), **or**
  - `NEXT_PUBLIC_DONATE_URL` if a static Dashboard Payment Link is preferred instead (fixed amount, no backend call).
- Remaining steps once verification clears: create the PWYW product in the Dodo dashboard, add the two/three env vars to Vercel, flip mode to `live`.

Code: `apps/web/components/SupportPanel.tsx`, `apps/web/app/api/donate/route.ts`.

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
