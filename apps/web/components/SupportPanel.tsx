"use client";

import { useState } from "react";
import { Modal } from "./ui/Modal";

const AMOUNTS = [
  { label: "☕ Tea", cents: 300, hint: "$3" },
  { label: "🏺 Offering", cents: 500, hint: "$5" },
  { label: "👑 Patron", cents: 1000, hint: "$10" },
  { label: "✦ Custom", cents: 0, hint: "Any" },
] as const;

/**
 * Optional tips via Stripe. Prefers a Dashboard Payment Link
 * (`NEXT_PUBLIC_STRIPE_DONATE_URL`); falls back to Checkout sessions when
 * `STRIPE_SECRET_KEY` is configured on the server.
 */
export function SupportPanel({ open, onClose }: { open: boolean; onClose(): void }) {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_DONATE_URL?.trim() || "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async (cents: number) => {
    setError(null);
    // Prefer a Dashboard Payment Link (no backend). Otherwise try Checkout API.
    if (paymentLink) {
      window.open(paymentLink, "_blank", "noopener,noreferrer");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: cents || 500 }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.url;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Set NEXT_PUBLIC_STRIPE_DONATE_URL or STRIPE_SECRET_KEY to enable tips.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Support the game"
      onClose={onClose}
      actions={
        <button className="btn rounded-lg px-4 py-2 text-sm" onClick={onClose}>
          Close
        </button>
      }
    >
      <p className="text-sm leading-relaxed text-[var(--ink-dim)]">
        Royal Game of Ur is free to play — no ads, no pay-to-win. If you enjoy racing seven pieces
        home, a tip keeps the servers warm and funds the next boards and dice.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {AMOUNTS.map((a) => (
          <button
            key={a.label}
            type="button"
            className="card btn rounded-xl px-3 py-3 text-left"
            disabled={busy}
            onClick={() => void go(a.cents)}
          >
            <div className="font-display text-sm">{a.label}</div>
            <div className="text-xs text-[var(--ink-dim)]">{a.hint}</div>
          </button>
        ))}
      </div>

      {paymentLink ? (
        <p className="mt-3 text-xs text-[var(--ink-dim)]">
          Secure checkout via Stripe. You&apos;ll leave the game briefly, then can return anytime.
        </p>
      ) : (
        <p className="mt-3 text-xs text-[var(--ink-dim)]">
          Tips open once a Stripe Payment Link is set (
          <code className="text-[var(--gold)]">NEXT_PUBLIC_STRIPE_DONATE_URL</code>
          ). Cosmetics (board &amp; dice skins) are planned next — never affect fair play.
        </p>
      )}

      {error ? <p className="mt-2 text-xs text-[var(--danger)]">{error}</p> : null}
    </Modal>
  );
}
