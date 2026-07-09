# Monetization plan

Core play stays free: no ads, no pay-to-win, server dice and Elo stay fair for everyone.

## Status (2026-07-10)

- **Support / tip UI is hidden** in the shipped app until a **custom domain** is attached and an **India-friendly** checkout is ready.
- **Stripe** and **Buy Me a Coffee** do not work for receiving as an individual in India (Stripe invite-only / creator platforms blocked).
- Planned path after domain: **Merchant of Record** such as [Dodo Payments](https://dodopayments.com/) (PAN for individuals; global cards) or Lemon Squeezy with PayPal payouts if available.
- Wire-up will reuse a single public env, e.g. `NEXT_PUBLIC_DONATE_URL`, and re-enable the Support control in the menu.

Code kept offline for later: `apps/web/components/SupportPanel.tsx`, `apps/web/app/api/donate/route.ts` (Stripe Checkout optional; not required if using an MoR payment link).

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
