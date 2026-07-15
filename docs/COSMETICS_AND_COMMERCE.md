# Cosmetics Commerce & Route Decision (Loop 20)

Written so the checkout and entitlements agents can implement from this doc alone. Confirms
CONTRACT.md's commerce lean and resolves the two things it left open (SKU→product mapping,
webhook vs. verify-on-return), with rationale for both.

## 1. Decision

**Route A — Dodo Checkout Sessions per price-tier product + Supabase entitlements.** Chosen,
not overturned.

Dodo is already a proven, working integration on this exact account: the donate route creates
test-mode checkout sessions today, so Route A reuses a pattern that already works end-to-end
instead of betting on an unverified one. Route B (static payment links per SKU) is rejected
because a static link has no clean way to carry *which signed-in profile* is buying — you'd
still need a server-side correlation step to grant the entitlement safely, at which point you've
rebuilt Route A with weaker guarantees and more manual dashboard upkeep (one static link per SKU
vs. one dynamic route). Route C (bundles-first) adds grant-expansion complexity (one purchase →
many SKUs) before the single-SKU loop is even proven, and bundles aren't part of CONTRACT's
locked SKU scheme — it's a good "expand"-phase addition, not a sound starting point. Route D
(tips-only) would abandon the sprint's premise with no supporting blocker; the donate route
proves Dodo checkout sessions work in test mode, so there's no technical reason to not sell
cosmetics. **No concrete blocker against Route A was found.** The only changes proposed are two
efficiency refinements *within* Route A — a tier-based product mapping instead of one Dodo
product per SKU, and verify-on-return as the first-shipped grant mechanism instead of
webhook-first — both are amendments to CONTRACT's lean, justified in §3.

## 2. Routes considered

| Route | India payouts | Test-mode proof | Effort | Idempotent grant | Guest UX | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| A. Checkout sessions + entitlements | same Dodo account as tips | proven (donate route) | moderate, precedented | yes — unique `(profile_id, sku)` | guests must sign in to buy (by design) | **Chosen** |
| B. Static payment links per SKU | same account | proven for tips only | low upfront, N links to hand-maintain | fragile — no clean profile linkage without reinventing A | no advantage over A | Rejected |
| C. Bundles-first | same account | proven | higher (one purchase expands to N grants) | harder | no advantage | Rejected as first route; fits "expand" phase |
| D. Tips-only, no cosmetics sale | n/a | n/a | zero | n/a | n/a | Rejected — no blocker found |

## 3. Amendments to CONTRACT's commerce lean (with rationale)

CONTRACT.md already names Route A primary — confirmed here, not overturned. Two refinements:

### 3a. Tier-based product mapping, not one Dodo product per SKU
CONTRACT text defers "SKU→product mapping decided in Loop 26"; this loop's prompt explicitly
asked for that scheme now, so it's decided here — flagging this so the "Loop 26" line in
CONTRACT.md doesn't confuse a later reader; the orchestrator can amend that line if it agrees.

Reasoning: the locked catalog has 12 paid SKUs today (+2 optional Star Omens). One Dodo Product
per SKU means a human manually creates 12–14 products in the dashboard, and every future SKU
repeats that manual step. Grouping SKUs into a small number of price tiers (§5) means only **4
Dodo Products ever need to exist**; new SKUs slot into an existing tier for free. The individual
`sku` still travels through the flow (checkout metadata / order reference, §4), so entitlements
stay exact per-SKU — only the *priced product* is shared across a tier.

### 3b. Verify-on-return first; webhook deferred to the "expand" phase
CONTRACT says "webhook preferred, verify-on-return fallback." This flips the shipping order:

- The donate route — the only concrete Dodo pattern available to ground any claim — has no
  webhook code at all, only `return_url`. There is no webhook payload shape or signing/
  verification mechanism anywhere in the files this agent may read.
- Implementing signature verification without grounding means inventing a security-critical
  contract, which this agent's own Avoid-list forbids ("promising webhook infrastructure that
  Dodo test mode can't deliver").
- Solo founder, pre-business-verification, dev-only sprint: no standing infra for a public
  webhook receiver yet. Verify-on-return needs nothing new — no signing secret, no inbound
  endpoint contract to reverse-engineer.
- Cosmetics entitlements are idempotent and carry no resellable/drainable value, so the one
  case verify-on-return can miss (buyer pays, then closes the tab before the redirect
  completes) is a rare, low-stakes, support-fixable edge case — not a trust failure.

Webhook stays the CONTRACT's long-term preference and belongs in the "expand" phase (§7),
once a human confirms Dodo's webhook contract in their dashboard/docs (§8).

## 4. Trust design for verify-on-return (so entitlements can't be forged)

Never trust a client-supplied `sku`, `amount`, or "I paid" claim off the return URL directly.

1. Client calls `POST /api/cosmetics/checkout { sku }` while signed in.
2. Server resolves `sku -> tier -> product_id` and `tier -> price` from the server-side catalog
   only — never accepts a client-supplied price. (The donate route accepts client-supplied
   `amountCents` because tips have no fixed price; cosmetics do, so amount must never come from
   the request body.)
3. Server creates the Dodo checkout session (same raw-fetch-to-`/checkouts` shape as the donate
   route), mints its own opaque order reference, and records a pending row — `profile_id`,
   `sku`, `dodo_checkout_id`, `status: pending` — before redirecting.
4. `return_url` carries only the opaque order reference, e.g. `/atelier?order=<id>` — not
   `sku`/`amount`.
5. On return, the server looks up the pending row by that order reference, then asks Dodo
   directly (server-to-server, secret key) whether `dodo_checkout_id` is paid. Only a "yes" from
   Dodo — never the return-URL query string alone — flips the row to granted and (idempotently)
   writes the entitlement.

This gives the same trust boundary a webhook would (Dodo's server confirms payment, not the
browser) — the server pulls instead of Dodo pushing.

## 5. Suggested price points per catalog tier

Creative agent owns final lore/pricing copy — these are starting suggestions only, in USD to
match the donate route's `amountCents` convention. Confirm settlement currency with the human
(§9).

| Tier id | Categories | Example SKUs | Suggested price | Dodo products needed |
| --- | --- | --- | --- | --- |
| `adornment` | flair (paid) | `flair.lapis_cartouche`, `flair.rosette_seal`, `flair.scribes_colophon` | $1.99 | 1 |
| `vessel_bone` | dice + piece (paid) | `dice.gold_inlaid_bone`, `dice.volcanic_obsidian`, `dice.carnelian_gold`, `piece.ivory_basalt`, `piece.lapis_eyes`, `piece.electrum_filigree` | $2.99 | 1 |
| `grand_board` | board (paid) | `board.cedar_bitumen`, `board.night_lapis`, `board.floodplain_parchment` | $4.99 | 1 |
| `star_omens` | rare board + flair (optional this sprint) | `board.venus_tablet`, `flair.morning_star` | $6.99 | 1 |

Total: **4 Dodo Products** cover all 12 (+2 optional) paid SKUs. If dice and pieces should price
apart later, split `vessel_bone` into two tiers (+1 product) — additive, not a rework.

## 6. Env vars (names only — no values, ever)

- `DODO_PAYMENTS_API_KEY` — existing, reused as-is (account-level secret already powering tips).
- `DODO_PAYMENTS_MODE` — existing, reused; stays `test`/unset for this entire sprint.
- `COSMETICS_DEV_GRANTS` — new; `"1"` grants every SKU locally with zero Dodo involvement (also
  true whenever `NODE_ENV === "development"`, per CONTRACT).
- `DODO_COSMETICS_PRODUCT_MAP` — new; the SKU→product mapping scheme decided this loop. JSON
  object string keyed by **tier id**, not by individual SKU — shape:
  `{ "adornment": "<product_id>", "vessel_bone": "<product_id>", "grand_board": "<product_id>", "star_omens": "<product_id>" }`.
  Parsed once server-side; the catalog module supplies `sku -> tier id`, this var supplies
  `tier id -> dodo product_id`. No SKU ever needs its own env var.

## 7. Phased efficiency order

1. **Free/equip pipeline** (domain + visual + atelier-ui agents, not this doc) —
   `resolveLoadout`, localStorage, DOM stamping, CSS tokens. Must work fully with zero payment
   config per CONTRACT's fallback rule; everything below depends on this existing first.
2. **Catalog UI** — AtelierPanel lists every SKU (owned vs. locked, price tag shown), no working
   "Buy" button yet.
3. **Dev grants** — `COSMETICS_DEV_GRANTS`/dev-mode bypass makes every SKU ownable locally with
   zero Dodo involvement, so every other agent can build/test the fully-owned experience before
   checkout exists at all.
4. **Test checkout** — `/api/cosmetics/checkout`, 4 fixed-price Dodo Products created by a human
   (§8), tier mapping wired, Dodo test mode only.
5. **Grants** — verify-on-return handler + `entitlements` migration `0007_*` (written, never
   applied to prod), idempotent insert on `(profile_id, sku)`.
6. **Expand** — bundles, Star Omens, webhook hardening (once a human confirms Dodo's webhook
   contract), live-mode flip (production — out of scope for this sprint/agent).

## 8. Human-only steps

- Create 4 fixed-price Products in the Dodo dashboard for cosmetics tiers (separate from the
  existing tips PWYW product): Adornment / Vessel & Bone / Grand Board / Star Omens.
- Confirm the existing `DODO_PAYMENTS_API_KEY` (from tips) is account-level and works unmodified
  for the new products — expected, not verified by this agent.
- Set `DODO_COSMETICS_PRODUCT_MAP` and `COSMETICS_DEV_GRANTS` values in the appropriate (dev/
  test) environment — values are never chosen or written by any agent.
- Confirm Dodo's checkout-session return-URL / retrieve-session API shape (does it support a
  session-id placeholder, or must the app mint and store its own order id and cross-reference at
  return time — this doc assumes the safer latter path, §4).
- Confirm Dodo's webhook payload shape and signing/verification mechanism in their dashboard/
  docs before the "expand" phase implements it — no agent has grounding for this today.
- Continue/finish Dodo business verification (already in progress per MONETIZATION.md) —
  required before any future live-mode flip, not required for test-mode cosmetics work.
- Apply the `0007_*` Supabase migration to production when ready (agents write it, never apply).
- Any future `DODO_PAYMENTS_MODE=live` flip and Vercel env changes — production, out of scope
  for every agent in this sprint.

## 9. Open questions for the human

- Settlement currency for cosmetics pricing — USD assumed above (matches donate route's cents
  convention); consider INR given the founder is India-based?
- Is the 4-tier grouping in §5 acceptable, or should dice/pieces split into separate tiers
  (+1 Dodo product)?
- Do Star Omens ship this sprint at all? CONTRACT marks them "optional this sprint" — if not,
  drop the `star_omens` tier/product until later.
- Confirm (or correct) the "mint our own order id, cross-reference at return" trust design in
  §4 against Dodo's actual return-URL templating once a human has checked their docs.

## 10. Handoff notes for checkout / entitlements agents

- Mirror the donate route's shape exactly: raw `fetch`, no SDK, `test`/`live` base URL switch on
  `DODO_PAYMENTS_MODE`, 503 JSON error when unconfigured (MONETIZATION.md's "a broken button is
  worse than no button" rule for the Support button applies equally to the Atelier "Buy" button).
- Catalog module (domain agent's `apps/web/lib/cosmetics/catalog.ts`) is the single source of
  truth for `sku -> tier id -> price`; the checkout route reads price from there, never from the
  client request body.
- Entitlements agent: unique constraint on `(profile_id, sku)` is the idempotency mechanism;
  RLS should let a profile `SELECT` only its own rows, `INSERT` only via service role/server
  route — never client-writable.
