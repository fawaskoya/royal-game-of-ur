import { NextResponse } from "next/server";

/**
 * Dodo Payments checkout session for tips (Merchant of Record — works for
 * individuals in India, unlike Stripe/Buy Me a Coffee). Raw `fetch` against
 * their REST API, no SDK dependency, matching the rest of this app's style.
 *
 * Dodo requires an existing Product (no ad-hoc/inline pricing) — set one
 * product to "Pay what you want" in the Dodo dashboard and its `amount`
 * field then carries whichever tip the player picks.
 *
 * Env:
 *   DODO_PAYMENTS_API_KEY     — secret, server-only
 *   DODO_PAYMENTS_PRODUCT_ID  — the PWYW product's id (not secret, but kept
 *                               server-side since only this route needs it)
 *   DODO_PAYMENTS_MODE        — "live" or "test" (default "test" — a donate
 *                               button must not go live by accident)
 *   NEXT_PUBLIC_SITE_URL      — optional, for the post-payment return_url
 */
export async function POST(req: Request) {
  const secret = process.env.DODO_PAYMENTS_API_KEY?.trim();
  const productId = process.env.DODO_PAYMENTS_PRODUCT_ID?.trim();
  if (!secret || !productId) {
    return NextResponse.json(
      { error: "Dodo Payments is not configured yet — set DODO_PAYMENTS_API_KEY and DODO_PAYMENTS_PRODUCT_ID." },
      { status: 503 },
    );
  }

  let amountCents = 500;
  try {
    const body = (await req.json()) as { amountCents?: number };
    if (typeof body.amountCents === "number" && body.amountCents >= 100 && body.amountCents <= 50_000) {
      amountCents = Math.round(body.amountCents);
    }
  } catch {
    // default tip
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const base = process.env.DODO_PAYMENTS_MODE === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";

  const res = await fetch(`${base}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_cart: [{ product_id: productId, quantity: 1, amount: amountCents }],
      return_url: `${origin}/?donated=1`,
    }),
  });

  const data = (await res.json()) as { checkout_url?: string; message?: string };
  if (!res.ok || !data.checkout_url) {
    return NextResponse.json({ error: data.message ?? "Dodo Payments checkout failed" }, { status: 502 });
  }

  return NextResponse.json({ url: data.checkout_url });
}
