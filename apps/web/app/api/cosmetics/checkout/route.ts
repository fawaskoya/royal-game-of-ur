import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UNLOCK_ALL_PRICE_USD } from "@/lib/cosmetics/catalog";

/**
 * "Unlock everything" checkout — ONE Dodo product ($1.99) unlocks every
 * sellable cosmetic. Mirrors the donate route's raw-fetch style.
 *
 * The buyer must have a session (guests included — anonymous auth counts):
 * their profile_id rides in the session `metadata`, and the WEBHOOK
 * (app/api/cosmetics/webhook) is the sole grant authority — Dodo's
 * return-URL `status` param is client-forgeable and never trusted.
 *
 * Env: DODO_PAYMENTS_API_KEY · DODO_COSMETICS_PRODUCT_ID · DODO_PAYMENTS_MODE
 * ("live" for real sales; anything else = test) · NEXT_PUBLIC_SUPABASE_URL ·
 * SUPABASE_SECRET_KEY (profile validation + row upsert).
 */
export async function POST(req: Request) {
  const secret = process.env.DODO_PAYMENTS_API_KEY?.trim();
  const productId = process.env.DODO_COSMETICS_PRODUCT_ID?.trim();
  if (!secret || !productId) {
    return NextResponse.json(
      { error: "The Store isn't open yet — purchases will be available soon." },
      { status: 503 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "server misconfigured" }, { status: 503 });
  }

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return NextResponse.json({ error: "sign-in required (guest sessions count)" }, { status: 401 });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return NextResponse.json({ error: "invalid session" }, { status: 401 });
  const uid = userData.user.id;

  // Entitlement rows FK onto profiles — make sure the row exists even for a
  // player who has never touched online play before buying.
  await admin.from("profiles").upsert({ id: uid }, { onConflict: "id", ignoreDuplicates: true });

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const live = process.env.DODO_PAYMENTS_MODE?.trim().toLowerCase() === "live";
  const base = live ? "https://live.dodopayments.com" : "https://test.dodopayments.com";

  const res = await fetch(`${base}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_cart: [{ product_id: productId, quantity: 1, amount: Math.round(UNLOCK_ALL_PRICE_USD * 100) }],
      metadata: { profile_id: uid, grant: "all_cosmetics_v1" },
      // Dodo appends payment_id & status to this on redirect.
      return_url: `${origin}/?store=return`,
    }),
  });

  const data = (await res.json()) as { checkout_url?: string; message?: string };
  if (!res.ok || !data.checkout_url) {
    return NextResponse.json({ error: data.message ?? "checkout failed" }, { status: 502 });
  }
  return NextResponse.json({ url: data.checkout_url });
}
