"use client";

/**
 * Client half of the dev-grant flow: ask the (hard-gated) API to validate
 * the SKU, then persist it into localStorage `devGrants` so the ownership
 * union picks it up everywhere. Outside development the API 404s and this
 * resolves false — no paid unlock path exists for ordinary players here.
 */
import { loadCosmetics, saveCosmetics } from "./storage";
import type { SkuId } from "./types";

export async function grantDevSku(sku: SkuId): Promise<boolean> {
  try {
    const res = await fetch("/api/cosmetics/dev-grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { granted?: string };
    if (data.granted !== sku) return false;

    const state = loadCosmetics();
    if (!state.devGrants.includes(sku)) {
      saveCosmetics({ ...state, devGrants: [...state.devGrants, sku] });
    }
    return true;
  } catch {
    return false;
  }
}
