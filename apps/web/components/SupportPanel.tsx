"use client";

import { useState } from "react";
import { getDonateUrl } from "@/lib/donate";
import { Modal } from "./ui/Modal";

const AMOUNTS = [
  { label: "☕ Tea", cents: 300, hint: "$3" },
  { label: "🏺 Offering", cents: 500, hint: "$5" },
  { label: "👑 Patron", cents: 1000, hint: "$10" },
  { label: "✦ Custom", cents: 0, hint: "Any" },
] as const;

/**
 * Voluntary tips via Dodo Payments (Merchant of Record — India-friendly).
 * Prefers a Dashboard Payment Link (`getDonateUrl()`); falls back to
 * Checkout Sessions via /api/donate when only server keys are configured.
 */
export function SupportPanel({ open, onClose }: { open: boolean; onClose(): void }) {
  const paymentLink = getDonateUrl();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCheckout = () => {
    if (!paymentLink) return;
    window.open(paymentLink, "_blank", "noopener,noreferrer");
  };

  const go = async (cents: number) => {
    setError(null);
    // Prefer a Dashboard Payment Link (no backend). Player picks amount on Dodo (PWYW).
    if (paymentLink) {
      openCheckout();
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
          : "Donate is not configured yet — set NEXT_PUBLIC_DONATE_URL or Dodo API keys.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Donate"
      onClose={onClose}
      actions={
        <button className="btn rounded-lg px-4 py-2 text-sm" onClick={onClose}>
          Close
        </button>
      }
    >
      <p className="text-sm leading-relaxed text-[var(--ink-dim)]">
        Royal Game of Ur is free — no ads, no pay-to-win. If the game has been kind to you,
        a small tip helps keep the lights on and the next boards polished. Only if you want
        to; the race is yours either way.
      </p>

      {paymentLink ? (
        <>
          <button
            type="button"
            className="btn btn-primary mt-4 w-full rounded-xl px-4 py-3 text-sm font-medium"
            onClick={openCheckout}
          >
            Donate ♡
          </button>
          <p className="mt-3 text-xs leading-relaxed text-[var(--ink-dim)]">
            Secure checkout via Dodo Payments — you can choose any amount. You&apos;ll leave
            briefly, then can return anytime.
          </p>
        </>
      ) : (
        <>
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
          <p className="mt-3 text-xs text-[var(--ink-dim)]">
            Tips open once Dodo Payments is configured (
            <code className="text-[var(--gold)]">DODO_PAYMENTS_API_KEY</code>
            ).
          </p>
        </>
      )}

      {error ? <p className="mt-2 text-xs text-[var(--danger)]">{error}</p> : null}
    </Modal>
  );
}
