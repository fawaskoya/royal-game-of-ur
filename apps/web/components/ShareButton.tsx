"use client";

import { useEffect, useRef, useState } from "react";
import type { Replay } from "@ur/engine";
import { shareUrl } from "@/lib/share";
import { markShared } from "@/lib/achievements";

type Phase = "idle" | "copied" | "failed";

/**
 * Share a finished game as a link. Uses the native share sheet where there is
 * one (phones), otherwise — or if the sheet is unavailable, as in some in-app
 * browsers — copies the link. The link carries the whole game (lib/share.ts),
 * so there is nothing to upload and nothing to expire.
 */
export function ShareButton({ replay, className }: { replay: Replay; className?: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const settle = (next: Phase) => {
    setPhase(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPhase("idle"), 2200);
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      markShared();
      settle("copied");
    } catch {
      settle("failed");
    }
  };

  const share = async () => {
    const url = shareUrl(window.location.origin, replay);
    if (url === null) return settle("failed");
    if (typeof navigator.share !== "function" || !window.matchMedia("(pointer: coarse)").matches) return copy(url);
    try {
      await navigator.share({ title: "Royal Game of Ur", text: "Watch this game of Ur", url });
      markShared();
    } catch (err) {
      // Dismissing the sheet is a choice, not a failure; anything else falls back to copying.
      if (err instanceof DOMException && err.name === "AbortError") return;
      await copy(url);
    }
  };

  return (
    <button className={className ?? "btn rounded-lg px-3 py-1.5 text-sm"} onClick={() => void share()}>
      {phase === "copied" ? "Link copied ✓" : phase === "failed" ? "Couldn't share" : "Share"}
    </button>
  );
}
