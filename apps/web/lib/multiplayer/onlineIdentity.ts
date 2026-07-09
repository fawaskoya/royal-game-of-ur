"use client";

/**
 * Who the player is online, and the ranked ladder around them. Identity is a
 * server-assigned handle (deterministic, editable via the own-profile RLS
 * policy); ratings are server-written only — the client just reads.
 */
import { ensureSession, getSupabaseClient } from "./supabaseClient";
import { invokeGameAction } from "./supabaseTransport";

export interface OnlineIdentity {
  handle: string;
  rating: number | null; // null until the first rated game
  gamesPlayed: number;
}

export async function fetchIdentity(): Promise<OnlineIdentity> {
  const token = await ensureSession();
  return invokeGameAction<OnlineIdentity>("whoami", {}, token);
}

export const HANDLE_MIN = 2;
export const HANDLE_MAX = 24;

/** Rename yourself. Enforced client-side and by a DB check constraint. */
export async function saveHandle(handle: string): Promise<string> {
  const cleaned = handle.replace(/\s+/g, " ").trim();
  if (cleaned.length < HANDLE_MIN || cleaned.length > HANDLE_MAX) {
    throw new Error(`Names are ${HANDLE_MIN}–${HANDLE_MAX} characters.`);
  }
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("online play is not configured");
  await ensureSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("no session");
  const { error } = await supabase.from("profiles").update({ handle: cleaned }).eq("id", user.id);
  if (error) throw new Error(error.message);
  return cleaned;
}

export interface LeaderboardRow {
  handle: string;
  rating: number;
  games: number;
  isMe: boolean;
}

/** Top of the casual pool plus your own row (flagged) if you're rated. */
export async function fetchLeaderboard(limit = 20): Promise<LeaderboardRow[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("online play is not configured");
  const { data: session } = await supabase.auth.getSession();
  const myId = session.session?.user.id ?? null;
  const { data, error } = await supabase
    .from("ratings")
    .select("profile_id, rating, games_played, profiles(handle)")
    .eq("pool", "casual")
    .order("rating", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    // Without generated DB types, supabase-js can't tell a to-one join from
    // a to-many, so `profiles` may be typed (or even shaped) as an array.
    const joined = row.profiles as unknown;
    const profile = (Array.isArray(joined) ? joined[0] : joined) as { handle: string | null } | null | undefined;
    return {
      handle: (profile?.handle ?? "Unnamed").slice(0, HANDLE_MAX),
      rating: row.rating as number,
      games: row.games_played as number,
      isMe: row.profile_id === myId,
    };
  });
}
