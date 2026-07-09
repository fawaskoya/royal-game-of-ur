# Monetization plan

Core play stays free: no ads, no pay-to-win, server dice and Elo stay fair for everyone.

## Now — tips (Stripe)

| Path | When to use |
|------|-------------|
| **Payment Link** | Fastest. Create a “Donate” link in [Stripe Dashboard → Payment Links](https://dashboard.stripe.com/payment-links). Set `NEXT_PUBLIC_STRIPE_DONATE_URL` on Vercel. |
| **Checkout API** | Fixed tip amounts ($3 / $5 / $10) via `POST /api/donate`. Needs `STRIPE_SECRET_KEY` (+ optional `NEXT_PUBLIC_SITE_URL`). |

UI: menu → **Support** (also on mobile compact bar).

## Next — cosmetics (not power)

Sell presentation only; never affect dice, matchmaking, or legality.

1. **Board skins** — museum wood, night lapis, parchment, seasonal.
2. **Dice skins** — bone, obsidian, gold-inlaid tetrahedra.
3. **Piece skins** — ivory / basalt / gem accents.
4. **Profile flair** — handle frame, badge (cosmetic ranks from seasons).

Suggested stack later: Stripe Checkout + Supabase `entitlements` table (profile_id, sku, granted_at); client reads owned SKUs and applies CSS themes. Grant once; no consumables that buy wins.

## Later — optional

- Season pass (cosmetics bundle + cosmetics currency)
- Private tournament hosting (paid room, still fair rules)
- Sponsor / education licenses for classrooms

## Principles

- Ranked & casual ladders never gated by payment.
- Guests can still play and tip anonymously.
- Cosmetic purchases never alter RNG or engine rules.
