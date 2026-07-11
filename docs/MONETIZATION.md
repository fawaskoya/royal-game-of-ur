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
