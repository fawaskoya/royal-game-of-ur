"use client";

/**
 * Account layer on top of Supabase Auth.
 * - Guests: anonymous session (ensureSession) — can still matchmake & play.
 * - Registered: email + password sign-up / sign-in; sessions persist.
 * - Upgrade: anonymous users can attach email/password without losing the uid.
 */
import { ensureSession, getSupabase } from "./supabaseClient";
import { fetchIdentity, type OnlineIdentity } from "./onlineIdentity";

export type AuthUser = {
  id: string;
  email: string | null;
  isAnonymous: boolean;
};

export type AuthSnapshot = {
  user: AuthUser | null;
  identity: OnlineIdentity | null;
};

/*
 * Snappy account UX. The real snapshot needs a session + a whoami round trip
 * (with possible Edge-Function cold start), which is the "Not connected for a
 * couple seconds" the lobby used to flash. Three layers hide that latency:
 *  1. In-memory cache + in-flight dedupe — once resolved this session, reads
 *     are synchronous and repeat opens don't refetch.
 *  2. Optimistic localStorage — a returning player sees their handle on the
 *     very first paint, revalidated in the background.
 *  3. prewarmAuth() fired the moment intent shows (selecting Find a match), so
 *     the network work overlaps the click.
 */
const IDENTITY_KEY = "ur:last-identity";

let cached: AuthSnapshot | null = null;
let inflight: Promise<AuthSnapshot> | null = null;

function readOptimistic(): AuthSnapshot | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (typeof v.handle !== "string" || typeof v.id !== "string") return null;
    return {
      user: { id: v.id, email: (v.email as string) ?? null, isAnonymous: v.isAnonymous !== false },
      identity: {
        handle: v.handle,
        rating: typeof v.rating === "number" ? v.rating : null,
        gamesPlayed: typeof v.gamesPlayed === "number" ? v.gamesPlayed : 0,
      },
    };
  } catch {
    return null;
  }
}

function persist(snap: AuthSnapshot): void {
  try {
    if (typeof window === "undefined") return;
    if (snap.user && snap.identity) {
      window.localStorage.setItem(
        IDENTITY_KEY,
        JSON.stringify({
          id: snap.user.id,
          email: snap.user.email,
          isAnonymous: snap.user.isAnonymous,
          handle: snap.identity.handle,
          rating: snap.identity.rating,
          gamesPlayed: snap.identity.gamesPlayed,
        }),
      );
    }
  } catch {
    /* storage unavailable — cache stays in-memory */
  }
}

/** Best snapshot available without waiting: live cache, else the persisted
 *  optimistic one. Null if we've never connected. */
export function getCachedSnapshot(): AuthSnapshot | null {
  return cached ?? readOptimistic();
}

/** Kick the real fetch off in the background (idempotent) so a later open is
 *  instant. Safe to call on user intent; a no-op if already warm/in flight. */
export function prewarmAuth(): void {
  if (cached || inflight) return;
  void getAuthSnapshot().catch(() => undefined);
}

async function computeSnapshot(): Promise<AuthSnapshot> {
  const supabase = await getSupabase();
  if (!supabase) return { user: null, identity: null };
  try {
    await ensureSession();
  } catch {
    return { user: null, identity: null };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, identity: null };
  const isAnonymous = Boolean(user.is_anonymous) || !user.email;
  let identity: OnlineIdentity | null = null;
  try {
    identity = await fetchIdentity();
  } catch {
    identity = null;
  }
  return {
    user: { id: user.id, email: user.email ?? null, isAnonymous },
    identity,
  };
}

export async function getAuthSnapshot(): Promise<AuthSnapshot> {
  if (inflight) return inflight;
  inflight = computeSnapshot();
  try {
    const snap = await inflight;
    // Only cache a real connection; keep any prior optimistic value otherwise.
    if (snap.user) {
      cached = snap;
      persist(snap);
    }
    return snap;
  } finally {
    inflight = null;
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthSnapshot> {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("online play is not configured");
  const cleaned = email.trim().toLowerCase();
  if (!cleaned.includes("@")) throw new Error("Enter a valid email address.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  // If already anonymous, attach credentials to this uid so ratings/history stay.
  const {
    data: { user: current },
  } = await supabase.auth.getUser();
  if (current && (current.is_anonymous || !current.email)) {
    const { error } = await supabase.auth.updateUser({ email: cleaned, password });
    if (error) throw new Error(error.message);
    return getAuthSnapshot();
  }

  const { error } = await supabase.auth.signUp({ email: cleaned, password });
  if (error) throw new Error(error.message);
  return getAuthSnapshot();
}

export async function signInWithEmail(email: string, password: string): Promise<AuthSnapshot> {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("online play is not configured");
  const cleaned = email.trim().toLowerCase();
  const { error } = await supabase.auth.signInWithPassword({ email: cleaned, password });
  if (error) throw new Error(error.message);
  return getAuthSnapshot();
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabase();
  if (!supabase) return;
  cached = null;
  try {
    window.localStorage.removeItem(IDENTITY_KEY);
  } catch {
    /* ignore */
  }
  await supabase.auth.signOut();
  // Next online action will mint a fresh guest via ensureSession.
}

export async function continueAsGuest(): Promise<AuthSnapshot> {
  await ensureSession();
  return getAuthSnapshot();
}
