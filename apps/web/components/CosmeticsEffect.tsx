"use client";

/**
 * Applies the equipped cosmetics to <html> as data attributes — the exact
 * mechanism ThemeEffect uses for data-theme, so skins restyle every surface
 * (menu vignette, game, tutorial, rooms, replay) through pure CSS token
 * overrides with zero component forking.
 *
 * SSR/hydration safety: the server renders no skin attributes and CSS
 * defaults equal the free skins exactly, so first paint is always the
 * classic look and this effect only *adds* attributes after mount — the
 * same acceptable flash budget the theme already has.
 *
 * Ownership is fail-closed on every application: free grants ∪ persisted
 * dev grants immediately, server entitlements merged when they arrive
 * (mount + sign-in/out). Equipping also publishes shared flair to the
 * profile (fire-and-forget; no-op offline) since flair is the one cosmetic
 * other players see.
 */
import { useEffect } from "react";
import {
  DEFAULT_LOADOUT,
  FREE_GRANTS,
  attrNameForCategory,
  fetchEntitlements,
  loadCosmetics,
  resolveLoadout,
  saveSharedFlair,
  skuToAttrValue,
  type CosmeticCategory,
  type CosmeticLoadout,
  type SkuId,
} from "@/lib/cosmetics";
import { getSupabaseClient } from "@/lib/multiplayer/supabaseClient";

const SLOT_FOR_CATEGORY: Record<CosmeticCategory, keyof CosmeticLoadout> = {
  board: "board",
  dice: "dice",
  piece: "pieces",
  flair: "flair",
};

export function CosmeticsEffect() {
  useEffect(() => {
    let serverOwned: SkuId[] = [];
    let lastSharedFlair: string | null = null;
    let disposed = false;

    const apply = () => {
      const state = loadCosmetics();
      const owned = new Set<SkuId>([...FREE_GRANTS, ...state.devGrants, ...serverOwned]);
      const resolved = resolveLoadout(state.loadout, owned);

      const root = document.documentElement;
      for (const category of Object.keys(SLOT_FOR_CATEGORY) as CosmeticCategory[]) {
        const slot = SLOT_FOR_CATEGORY[category];
        const sku = resolved[slot];
        const attr = attrNameForCategory(category);
        // Default = attribute absent, so unskinned markup stays canonical.
        if (sku === DEFAULT_LOADOUT[slot]) root.removeAttribute(attr);
        else root.setAttribute(attr, skuToAttrValue(sku));
      }

      // Share flair once per distinct value; harmless no-op offline.
      const share = resolved.flair === "flair.none" ? null : resolved.flair;
      if (share !== lastSharedFlair) {
        lastSharedFlair = share;
        void saveSharedFlair(share);
      }
    };

    const refreshEntitlements = () => {
      void fetchEntitlements().then((skus) => {
        if (disposed) return;
        serverOwned = skus;
        apply();
      });
    };

    apply();
    refreshEntitlements();
    window.addEventListener("ur:cosmetics-changed", apply);

    // Back from Dodo checkout: the webhook grants server-side moments after
    // redirect, so poll entitlements briefly, then clean the URL. The status
    // param is never TRUSTED (webhook is the authority) — it only tells us
    // polling is worth doing.
    const timers: ReturnType<typeof setTimeout>[] = [];
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment_id") && params.get("status") === "succeeded") {
        for (const delay of [1500, 4000, 8000, 15000, 25000]) {
          timers.push(setTimeout(refreshEntitlements, delay));
        }
        params.delete("payment_id");
        params.delete("status");
        params.delete("store");
        const query = params.toString();
        window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
      }
    } catch {
      /* URL cleanup is cosmetic — never let it break the effect */
    }

    // Sign-in/out changes what's owned (and may un-resolve an equipped paid
    // skin) — re-merge server entitlements on auth transitions.
    const supabase = getSupabaseClient();
    const sub = supabase?.auth.onAuthStateChange(() => refreshEntitlements());

    return () => {
      disposed = true;
      for (const t of timers) clearTimeout(t);
      window.removeEventListener("ur:cosmetics-changed", apply);
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  return null;
}
