import { NextResponse } from "next/server";

/**
 * Stripe Checkout session for tips. Optional — the Support panel also works
 * with a Dashboard Payment Link (`NEXT_PUBLIC_STRIPE_DONATE_URL`) and never
 * needs this route.
 *
 * Env: STRIPE_SECRET_KEY, optional NEXT_PUBLIC_SITE_URL for success/cancel.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "Stripe is not configured. Set STRIPE_SECRET_KEY or NEXT_PUBLIC_STRIPE_DONATE_URL." },
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

  // Prefer the official Stripe API without a hard dependency when secret is set.
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${origin}/?donated=1`);
  params.set("cancel_url", `${origin}/?donated=0`);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(amountCents));
  params.set("line_items[0][price_data][product_data][name]", "Royal Game of Ur — tip");
  params.set(
    "line_items[0][price_data][product_data][description]",
    "Thank you for supporting a free, fair online Game of Ur.",
  );
  params.set("submit_type", "donate");

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = (await res.json()) as { url?: string; error?: { message?: string } };
  if (!res.ok || !data.url) {
    return NextResponse.json(
      { error: data.error?.message ?? "Stripe checkout failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: data.url });
}
