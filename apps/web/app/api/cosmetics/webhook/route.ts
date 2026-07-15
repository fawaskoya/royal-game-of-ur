import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { ALL_PAID_SKUS } from "@/lib/cosmetics/catalog";

/**
 * Dodo Payments webhook — the SOLE grant authority for Store purchases.
 * Return-URL params are client-forgeable; this signed event is not.
 *
 * Verification per the Standard Webhooks spec (Dodo docs, Developer →
 * Webhooks): headers `webhook-id` / `webhook-timestamp` / `webhook-signature`,
 * signed content `${id}.${timestamp}.${rawBody}`, HMAC-SHA256 keyed with the
 * base64-decoded endpoint secret (`whsec_…`), signature header holds one or
 * more space-separated `v1,<base64>` entries.
 *
 * On `payment.succeeded` with our `metadata.grant === "all_cosmetics_v1"`:
 * upsert one entitlement row per sellable SKU for `metadata.profile_id`.
 * Idempotent by construction — (profile_id, sku) is the primary key and the
 * upsert ignores duplicates, so Dodo's retries are harmless.
 *
 * Env: DODO_WEBHOOK_SECRET · NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SECRET_KEY.
 */
export const runtime = "nodejs";

const TOLERANCE_SECONDS = 5 * 60;

function verifySignature(secretRaw: string, id: string, timestamp: string, body: string, header: string): boolean {
  const key = Buffer.from(secretRaw.replace(/^whsec_/, ""), "base64");
  if (key.length === 0) return false;
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`, "utf8").digest();
  for (const part of header.split(" ")) {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) continue;
    let candidate: Buffer;
    try {
      candidate = Buffer.from(sig, "base64");
    } catch {
      continue;
    }
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) return true;
  }
  return false;
}

export async function POST(req: Request) {
  const secret = process.env.DODO_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "webhook not configured" }, { status: 503 });

  const id = req.headers.get("webhook-id") ?? "";
  const timestamp = req.headers.get("webhook-timestamp") ?? "";
  const signature = req.headers.get("webhook-signature") ?? "";
  const body = await req.text();

  if (!id || !timestamp || !signature) return NextResponse.json({ error: "missing signature headers" }, { status: 401 });
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) {
    return NextResponse.json({ error: "stale timestamp" }, { status: 401 });
  }
  if (!verifySignature(secret, id, timestamp, body, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(body) as typeof event;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // Only one event matters to us; everything else is acknowledged unread.
  if (event.type !== "payment.succeeded") return NextResponse.json({ received: true });

  const data = event.data ?? {};
  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  if (metadata.grant !== "all_cosmetics_v1" || typeof metadata.profile_id !== "string") {
    return NextResponse.json({ received: true, skipped: "not a store purchase" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const profileId = metadata.profile_id;
  const paymentRef = typeof data.payment_id === "string" ? data.payment_id : id;

  await admin.from("profiles").upsert({ id: profileId }, { onConflict: "id", ignoreDuplicates: true });
  const rows = ALL_PAID_SKUS.map((sku) => ({
    profile_id: profileId,
    sku,
    source: "purchase",
    provider: "dodo",
    provider_ref: paymentRef,
  }));
  const { error } = await admin.from("entitlements").upsert(rows, {
    onConflict: "profile_id,sku",
    ignoreDuplicates: true,
  });
  if (error) {
    // 500 makes Dodo retry — correct for a transient DB failure.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true, granted: rows.length });
}
