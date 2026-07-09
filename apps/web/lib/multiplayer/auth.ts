"use client";

/**
 * Account layer on top of Supabase Auth.
 * - Guests: anonymous session (ensureSession) — can still matchmake & play.
 * - Registered: email + password sign-up / sign-in; sessions persist.
 * - Upgrade: anonymous users can attach email/password without losing the uid.
 */
import { ensureSession, getSupabaseClient } from "./supabaseClient";
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

export async function getAuthSnapshot(): Promise<AuthSnapshot> {
  const supabase = getSupabaseClient();
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

export async function signUpWithEmail(email: string, password: string): Promise<AuthSnapshot> {
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("online play is not configured");
  const cleaned = email.trim().toLowerCase();
  const { error } = await supabase.auth.signInWithPassword({ email: cleaned, password });
  if (error) throw new Error(error.message);
  return getAuthSnapshot();
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
  // Next online action will mint a fresh guest via ensureSession.
}

export async function continueAsGuest(): Promise<AuthSnapshot> {
  await ensureSession();
  return getAuthSnapshot();
}
