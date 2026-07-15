"use client";

/**
 * Profile flair — the one cosmetic other players can see (contract:
 * Multiplayer v1). Pure presentation: tiny inline glyphs keyed by flair SKU,
 * ≤1em tall, zero width when absent, so identity rows never shift layout.
 *
 * Own-flair surfaces use `useOwnFlair()` (local loadout, resolved against
 * ownership fail-closed, live via the `ur:cosmetics-changed` event). Shared
 * flair for OTHER players arrives wherever profile data already flows
 * (`profiles.flair` after migration 0007) — the leaderboard intentionally
 * renders none this sprint because its row query carries no flair field and
 * adding per-row fetches is forbidden.
 */
import { useEffect, useState } from "react";
import {
  FREE_GRANTS,
  fetchEntitlements,
  loadCosmetics,
  resolveLoadout,
  type SkuId,
} from "@/lib/cosmetics";

const GLYPHS: Record<string, { glyph: string; color: string; title: string; boxed?: boolean }> = {
  "flair.lapis_cartouche": { glyph: "✦", color: "#5c7ec9", title: "Lapis Cartouche", boxed: true },
  "flair.rosette_seal": { glyph: "❁", color: "#c9a24b", title: "Rosette Seal" },
  "flair.scribes_colophon": { glyph: "𒀭", color: "#9a927e", title: "Scribe's Colophon" },
  "flair.morning_star": { glyph: "✧", color: "#cbd0e6", title: "Morning Star" },
  "flair.first_dig": { glyph: "⛏", color: "#a56a2f", title: "First Dig" },
};

export function Flair({ flair, className }: { flair: SkuId | null | undefined; className?: string }) {
  if (!flair || flair === "flair.none") return null;
  const spec = GLYPHS[flair];
  if (!spec) return null;
  return (
    <span
      aria-label={spec.title}
      title={spec.title}
      className={[
        "inline-flex h-[1em] items-center justify-center align-middle text-[0.85em] leading-none",
        spec.boxed ? "rounded-[0.25em] px-[0.2em] ring-1 ring-current" : "",
        className ?? "",
      ].join(" ")}
      style={{ color: spec.color }}
    >
      {spec.glyph}
    </span>
  );
}

/** The local player's equipped flair, resolved fail-closed against ownership
 * (free ∪ devGrants immediately; server entitlements merged when they load). */
export function useOwnFlair(): SkuId | null {
  const [flair, setFlair] = useState<SkuId | null>(null);

  useEffect(() => {
    let serverOwned: SkuId[] = [];
    let disposed = false;

    const recompute = () => {
      const state = loadCosmetics();
      const owned = new Set<SkuId>([...FREE_GRANTS, ...state.devGrants, ...serverOwned]);
      const resolved = resolveLoadout(state.loadout, owned);
      setFlair(resolved.flair === "flair.none" ? null : resolved.flair);
    };

    recompute();
    void fetchEntitlements().then((skus) => {
      if (disposed) return;
      serverOwned = skus;
      recompute();
    });

    window.addEventListener("ur:cosmetics-changed", recompute);
    return () => {
      disposed = true;
      window.removeEventListener("ur:cosmetics-changed", recompute);
    };
  }, []);

  return flair;
}

/** Convenience: render the local player's own flair (or nothing). */
export function OwnFlair({ className }: { className?: string }) {
  const flair = useOwnFlair();
  return <Flair flair={flair} className={className} />;
}
