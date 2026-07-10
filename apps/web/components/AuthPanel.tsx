"use client";

import { useEffect, useState } from "react";
import {
  getAuthSnapshot,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  type AuthSnapshot,
} from "@/lib/multiplayer/auth";
import { saveHandle, HANDLE_MAX, HANDLE_MIN } from "@/lib/multiplayer/onlineIdentity";

/**
 * Compact account strip for matchmaking / online lobbies.
 * Guests play freely; email sign-up keeps the same uid when upgrading from anonymous.
 */
export function AuthPanel({
  auth,
  onAuthChange,
  loading = false,
}: {
  auth: AuthSnapshot;
  onAuthChange(next: AuthSnapshot): void;
  /** True while the first snapshot is still resolving — shows "Connecting…"
   *  rather than the alarming "Not connected" during normal startup. */
  loading?: boolean;
}) {
  const [mode, setMode] = useState<"idle" | "signin" | "signup" | "rename">("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState(auth.identity?.handle ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHandle(auth.identity?.handle ?? "");
  }, [auth.identity?.handle]);

  const run = async (fn: () => Promise<AuthSnapshot | void>) => {
    setBusy(true);
    setError(null);
    try {
      const next = await fn();
      if (next) onAuthChange(next);
      setMode("idle");
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const user = auth.user;
  const identity = auth.identity;

  return (
    <div className="card flex flex-col gap-3 rounded-xl p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--ink-dim)]">Account</div>
          {user ? (
            <div className="mt-1 font-display text-base">
              {identity?.handle ?? "Player"}
              <span className="ml-2 chip">
                {user.isAnonymous ? "Guest" : "Signed in"}
              </span>
            </div>
          ) : (
            <div className="mt-1 text-[var(--ink-dim)]">{loading ? "Connecting…" : "Not connected"}</div>
          )}
          {identity?.rating != null ? (
            <div className="mt-0.5 text-xs text-[var(--ink-dim)]">
              Rating {identity.rating} · {identity.gamesPlayed} games
            </div>
          ) : user ? (
            <div className="mt-0.5 text-xs text-[var(--ink-dim)]">Unrated — first match sets your Elo</div>
          ) : null}
          {user?.email ? <div className="mt-0.5 text-xs text-[var(--ink-dim)]">{user.email}</div> : null}
        </div>
        {user && mode === "idle" ? (
          <div className="flex flex-col items-end gap-1">
            <button className="text-xs text-[var(--gold)] underline-offset-2 hover:underline" onClick={() => setMode("rename")}>
              Rename
            </button>
            {user.isAnonymous ? (
              <button className="text-xs text-[var(--gold)] underline-offset-2 hover:underline" onClick={() => setMode("signup")}>
                Create account
              </button>
            ) : (
              <button
                className="text-xs text-[var(--ink-dim)] underline-offset-2 hover:underline"
                onClick={() => void run(async () => { await signOut(); return getAuthSnapshot(); })}
              >
                Sign out
              </button>
            )}
            {user.isAnonymous ? (
              <button className="text-xs text-[var(--ink-dim)] underline-offset-2 hover:underline" onClick={() => setMode("signin")}>
                Sign in
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {mode === "rename" ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const nextHandle = await saveHandle(handle);
              const snap = await getAuthSnapshot();
              return {
                ...snap,
                identity: snap.identity
                  ? { ...snap.identity, handle: nextHandle }
                  : { handle: nextHandle, rating: null, gamesPlayed: 0 },
              };
            });
          }}
        >
          <label className="text-xs text-[var(--ink-dim)]" htmlFor="auth-handle">
            Display name ({HANDLE_MIN}–{HANDLE_MAX} chars)
          </label>
          <input
            id="auth-handle"
            className="btn rounded-lg px-3 py-2 text-sm"
            value={handle}
            maxLength={HANDLE_MAX}
            onChange={(e) => setHandle(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary flex-1 rounded-lg px-3 py-2 text-sm" disabled={busy}>
              Save
            </button>
            <button type="button" className="btn rounded-lg px-3 py-2 text-sm" onClick={() => setMode("idle")}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {mode === "signin" || mode === "signup" ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() =>
              mode === "signup" ? signUpWithEmail(email, password) : signInWithEmail(email, password),
            );
          }}
        >
          <p className="text-xs text-[var(--ink-dim)]">
            {mode === "signup"
              ? "Create an account to keep your rating across devices. Guests can still play."
              : "Sign in to your account."}
          </p>
          <input
            type="email"
            autoComplete="email"
            placeholder="Email"
            className="btn rounded-lg px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="Password (6+ characters)"
            className="btn rounded-lg px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary flex-1 rounded-lg px-3 py-2 text-sm" disabled={busy}>
              {busy ? "…" : mode === "signup" ? "Sign up" : "Sign in"}
            </button>
            <button type="button" className="btn rounded-lg px-3 py-2 text-sm" onClick={() => setMode("idle")}>
              Cancel
            </button>
          </div>
          <button
            type="button"
            className="text-xs text-[var(--ink-dim)] underline-offset-2 hover:underline"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          >
            {mode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>
        </form>
      ) : null}

      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
