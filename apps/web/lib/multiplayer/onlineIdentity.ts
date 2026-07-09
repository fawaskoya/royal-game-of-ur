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
  rank: number;
  handle: string;
  rating: number;
  games: number;
  wins: number;
  losses: number;
  winRate: number | null;
  updatedAt: string | null;
  isMe: boolean;
}

/** Top of the casual pool plus your own row (flagged) if you're rated. */
export async function fetchLeaderboard(limit = 25): Promise<LeaderboardRow[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("online play is not configured");
  const { data: session } = await supabase.auth.getSession();
  const myId = session.session?.user.id ?? null;
  const { data, error } = await supabase
    .from("ratings")
    .select("profile_id, rating, games_played, wins, losses, updated_at, profiles(handle)")
    .eq("pool", "casual")
    .order("rating", { ascending: false })
    .order("games_played", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((row, i) => {
    const joined = row.profiles as unknown;
    const profile = (Array.isArray(joined) ? joined[0] : joined) as { handle: string | null } | null | undefined;
    const games = (row.games_played as number) ?? 0;
    const wins = (row.wins as number | null | undefined) ?? 0;
    const losses = (row.losses as number | null | undefined) ?? 0;
    const decided = wins + losses;
    return {
      rank: i + 1,
      handle: (profile?.handle ?? "Unnamed").slice(0, HANDLE_MAX),
      rating: row.rating as number,
      games,
      wins,
      losses,
      winRate: decided > 0 ? wins / decided : null,
      updatedAt: (row.updated_at as string | null) ?? null,
      isMe: row.profile_id === myId,
    } satisfies LeaderboardRow;
  });

  // If the signed-in player is rated but outside the top N, append their row.
  if (myId && !rows.some((r) => r.isMe)) {
    const { data: mine } = await supabase
      .from("ratings")
      .select("profile_id, rating, games_played, wins, losses, updated_at, profiles(handle)")
      .eq("pool", "casual")
      .eq("profile_id", myId)
      .maybeSingle();
    if (mine) {
      const { count } = await supabase
        .from("ratings")
        .select("profile_id", { count: "exact", head: true })
        .eq("pool", "casual")
        .gt("rating", mine.rating as number);
      const joined = mine.profiles as unknown;
      const profile = (Array.isArray(joined) ? joined[0] : joined) as { handle: string | null } | null | undefined;
      const games = (mine.games_played as number) ?? 0;
      const wins = (mine.wins as number | null | undefined) ?? 0;
      const losses = (mine.losses as number | null | undefined) ?? 0;
      const decided = wins + losses;
      rows.push({
        rank: (count ?? 0) + 1,
        handle: (profile?.handle ?? "Unnamed").slice(0, HANDLE_MAX),
        rating: mine.rating as number,
        games,
        wins,
        losses,
        winRate: decided > 0 ? wins / decided : null,
        updatedAt: (mine.updated_at as string | null) ?? null,
        isMe: true,
      });
    }
  }

  return rows;
}
