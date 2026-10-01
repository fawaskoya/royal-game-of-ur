"use client";

import { useState } from "react";
import type { Replay } from "@ur/engine";
import { shareUrl } from "@/lib/share";
import { markShared } from "@/lib/achievements";

type Phase = "idle" | "copied" | "failed";

/**
 * Share a finished game as a link. Uses the native share sheet where there is
 * one (phones), otherwise copies the link. The link carries the whole game —
 * see lib/share.ts — so there is nothing to upload and nothing to expire.
 */
export function ShareButton({ replay, className }: { replay: Replay; className?: string }) {
  const [phase, setPhase] = useState<Phase>("idle");

  const settle = (next: Phase) => {
    setPhase(next);
    setTimeout(() => setPhase("idle"), 2200);
  };

  const share = async () => {
    const url = shareUrl(window.location.origin, replay);
    if (url === null) return settle("failed");
    try {
      if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: "Royal Game of Ur", text: "Watch this game of Ur", url });
        markShared();
        return;
      }
      await navigator.clipboard.writeText(url);
      markShared();
      settle("copied");
    } catch (err) {
      // Dismissing the share sheet is not an error.
      if (err instanceof DOMException && err.name === "AbortError") return;
      settle("failed");
    }
  };

  return (
    <button className={className ?? "btn rounded-lg px-3 py-1.5 text-sm"} onClick={() => void share()}>
      {phase === "copied" ? "Link copied ✓" : phase === "failed" ? "Couldn't share" : "Share"}
    </button>
  );
}
