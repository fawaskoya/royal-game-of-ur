/**
 * Server-side entitlement lookup + shared-flair sync (Supabase).
 *
 * Every function here degrades to a harmless no-op/[]/empty result when the
 * player is offline, signed out, Supabase isn't configured, or migration
 * 0007 hasn't been applied yet (unknown column/table errors are swallowed) —
 * so the equip pipeline keeps working with zero backend, per contract:
 * `owned = FREE_GRANTS ∪ devGrants ∪ serverEntitlements`.
 *
 * Trust model: `entitlements` rows are written only by trusted server code
 * (RLS has no client write policies — see migration 0007); this module only
 * reads. `profiles.flair` IS client-writable (own row, policy from 0001)
 * because flair is pure decoration on your own name — equipping a paid
 * flair is still gated by ownership via resolveLoadout before anything
 * calls `saveSharedFlair`.
 */
import { getSupabase, getSupabaseIfSession } from "@/lib/multiplayer/supabaseClient";
import { CATALOG_BY_ID } from "./catalog";
import type { SkuId } from "./types";

export interface FetchEntitlements {
  (): Promise<SkuId[]>;
}

function isKnownSku(value: unknown): value is SkuId {
  return typeof value === "string" && CATALOG_BY_ID.has(value as SkuId);
}

/** Paid SKUs the signed-in player owns server-side; [] in every failure mode. */
export const fetchEntitlements: FetchEntitlements = async () => {
  try {
    const supabase = await getSupabaseIfSession();
    if (!supabase) return [];
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return [];
    const { data, error } = await supabase.from("entitlements").select("sku");
    if (error || !data) return [];
    return data.map((row) => row.sku).filter(isKnownSku);
  } catch {
    return [];
  }
};

/** Publish (or clear, with null) my equipped flair to my profile so other
 * players' identity surfaces can show it. Fire-and-forget semantics. */
export async function saveSharedFlair(flair: SkuId | null): Promise<boolean> {
  try {
    const supabase = await getSupabaseIfSession();
    if (!supabase) return false;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    // `flair.none` shares as null — an absent flair, not a value.
    const value = flair === null || flair === "flair.none" ? null : flair;
    const { error } = await supabase.from("profiles").update({ flair: value }).eq("id", user.id);
    return !error;
  } catch {
    return false;
  }
}

/** Batch-read other players' shared flair (profiles are publicly readable).
 * Returns only rows that have a known flair set; {} on any failure. */
export async function fetchSharedFlair(profileIds: readonly string[]): Promise<Record<string, SkuId>> {
  try {
    if (profileIds.length === 0) return {};
    const supabase = await getSupabase();
    if (!supabase) return {};
    const { data, error } = await supabase.from("profiles").select("id, flair").in("id", [...profileIds]);
    if (error || !data) return {};
    const out: Record<string, SkuId> = {};
    for (const row of data) {
      if (typeof row.id === "string" && isKnownSku(row.flair)) out[row.id] = row.flair;
    }
    return out;
  } catch {
    return {};
  }
}
