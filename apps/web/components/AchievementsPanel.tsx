"use client";

import { useEffect, useMemo } from "react";
import { ACHIEVEMENTS, unlockedIds, loadAchievementState, markSeen } from "@/lib/achievements";
import { loadDaily } from "@/lib/daily";
import { loadResults } from "@/lib/stats/matchResults";
import { loadTutorialProgress } from "@/lib/useTutorial";
import { Modal } from "./ui/Modal";

/** Every achievement, earned or not. All derived from data already on the device. */
export function AchievementsPanel({ open, onClose }: { open: boolean; onClose(): void }) {
  const unlocked = useMemo(() => {
    if (!open) return null;
    const ids = new Set(
      unlockedIds({
        results: loadResults(),
        tutorialCompleted: loadTutorialProgress().completed,
        daily: loadDaily(),
        sharedGame: loadAchievementState().shared,
      }),
    );
    return ids;
  }, [open]);

  // Viewing the list counts as being told — no toast later for these.
  useEffect(() => {
    if (unlocked) markSeen([...unlocked]);
  }, [unlocked]);

  if (!unlocked) return null;

  return (
    <Modal
      open={open}
      title={`Achievements · ${unlocked.size}/${ACHIEVEMENTS.length}`}
      onClose={onClose}
      actions={
        <button className="btn btn-primary rounded-lg px-4 py-2 text-sm" onClick={onClose}>
          Done
        </button>
      }
    >
      <ul className="-mx-1 max-h-[55dvh] overflow-y-auto">
        {ACHIEVEMENTS.map((a) => {
          const got = unlocked.has(a.id);
          return (
            <li key={a.id} className={["flex items-center gap-3 border-b border-white/5 px-1 py-2 last:border-0", got ? "" : "opacity-50"].join(" ")}>
              <span aria-hidden className={["w-6 text-center text-lg", got ? "text-[var(--gold)]" : ""].join(" ")}>
                {got ? a.glyph : "·"}
              </span>
              <span className="min-w-0 flex-1">
                <span className={["block text-sm", got ? "text-[var(--ink)]" : ""].join(" ")}>{a.title}</span>
                <span className="block text-xs text-[var(--ink-dim)]">{a.blurb}</span>
              </span>
              <span className="sr-only">{got ? "Unlocked" : "Locked"}</span>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
