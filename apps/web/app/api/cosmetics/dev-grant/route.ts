import { NextResponse } from "next/server";
import { CATALOG_BY_ID } from "@/lib/cosmetics/catalog";
import type { SkuId } from "@/lib/cosmetics/types";

/**
 * Dev-only unlock for testing the paid-equip pipeline without any payment
 * config. HARD-GATED: outside development (or an explicit
 * COSMETICS_DEV_GRANTS=1) the route pretends not to exist (404), so it can
 * ship in the codebase without ever being a production backdoor.
 *
 * Ownership itself is client-side for dev grants (localStorage devGrants,
 * applied by lib/cosmetics/devGrants.ts after this validates) — the server's
 * only job here is validating the SKU and enforcing the gate.
 */
export async function POST(req: Request) {
  const enabled = process.env.NODE_ENV === "development" || process.env.COSMETICS_DEV_GRANTS === "1";
  if (!enabled) return NextResponse.json({ error: "not found" }, { status: 404 });

  let sku: unknown;
  try {
    sku = ((await req.json()) as { sku?: unknown }).sku;
  } catch {
    return NextResponse.json({ error: "body must be JSON with { sku }" }, { status: 400 });
  }

  const entry = typeof sku === "string" ? CATALOG_BY_ID.get(sku as SkuId) : undefined;
  if (!entry) return NextResponse.json({ error: "unknown sku" }, { status: 400 });
  if (entry.priceUsd === null && !entry.lockedByDefault) {
    return NextResponse.json({ error: "that sku is already free" }, { status: 400 });
  }

  return NextResponse.json({ granted: entry.id });
}
