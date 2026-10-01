"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { Replay } from "@ur/engine";
import { deleteArchiveEntry, loadArchive, replayOf, type ArchiveEntry } from "@/lib/archive";
import { Modal } from "./ui/Modal";
import { ReplayViewer } from "./ReplayViewer";
import { findBiggestCapture } from "@/lib/captures";

function entryLabel(entry: ArchiveEntry): string {
  const mode = entry.mode;
  const who =
    mode.kind === "pvp"
      ? "Two players"
      : mode.kind === "ai"
        ? `vs ${mode.difficulty}`
        : mode.kind === "online"
          ? `vs ${mode.opponent ?? "guest"} · online`
          : `${mode.light} vs ${mode.dark}`;
  return `${entry.winner === 0 ? "☀ Light" : "☾ Dark"} won · ${who} · ${entry.turns} turns`;
}

function dateLabel(iso: string): string {
  const date = new Date(iso);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
        " " +
        date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : "—";
}

/** Menu panel over the finished-games archive: watch, analyze, export, delete. */
export function ArchivePanel({ open, onClose }: { open: boolean; onClose(): void }) {
  const [generation, setGeneration] = useState(0);
  const [viewing, setViewing] = useState<{ replay: Replay; analyze: boolean; startAt?: number } | null>(null);
  const entries = useMemo(() => {
    void generation;
    return open ? [...loadArchive()].reverse() : [];
  }, [open, generation]);

  // Capture of the day: the hardest hit among the last 24 hours of games,
  // or — if you haven't played today — the hardest hit on record.
  const highlight = useMemo(() => {
    if (!open || entries.length === 0) return null;
    const dayAgo = Date.now() - 86_400_000;
    const pick = (list: ArchiveEntry[]) => {
      let best: { entry: ArchiveEntry; replay: Replay; eventIndex: number; progress: number } | null = null;
      for (const entry of list) {
        const replay = replayOf(entry);
        const cap = replay ? findBiggestCapture(replay) : null;
        if (replay && cap && (best === null || cap.victimProgress > best.progress)) {
          best = { entry, replay, eventIndex: cap.eventIndex, progress: cap.victimProgress };
        }
      }
      return best;
    };
    const recent = entries.filter((e) => new Date(e.completedAt).getTime() >= dayAgo);
    const today = pick(recent);
    return today ? { ...today, label: "Capture of the day" } : (() => {
      const ever = pick(entries);
      return ever ? { ...ever, label: "Biggest capture on record" } : null;
    })();
  }, [open, entries]);

  return (
    <>
      <Modal
        open={open && viewing === null}
        title="Finished games"
        onClose={onClose}
        actions={
          <button className="btn btn-primary rounded-lg px-4 py-2 text-sm" onClick={onClose}>
            Done
          </button>
        }
      >
        {entries.length === 0 ? (
          <p>No finished games yet. Completed games are kept here automatically — the last 20.</p>
        ) : (
          <>
          {highlight ? (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-[var(--gold-faint)] bg-[var(--bg-raised)]/70 px-3 py-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-[var(--gold)]">{highlight.label}</div>
                <div className="truncate text-sm text-[var(--ink)]">
                  ⚔ A piece sent back from square {highlight.progress}
                </div>
              </div>
              <button
                className="btn shrink-0 rounded-lg px-2.5 py-1 text-xs"
                onClick={() =>
                  setViewing({ replay: highlight.replay, analyze: false, startAt: highlight.eventIndex })
                }
              >
                Watch
              </button>
            </div>
          ) : null}
          <ol className="-mx-1 max-h-[50dvh] overflow-y-auto">
            {entries.map((entry) => (
              <li key={entry.id} className="border-b border-white/5 px-1 py-2 last:border-0">
                <div className="text-sm text-[var(--ink)]">{entryLabel(entry)}</div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--ink-dim)]">{dateLabel(entry.completedAt)}</span>
                  <span className="flex gap-1.5">
                    {(["watch", "analyze"] as const).map((action) => (
                      <button
                        key={action}
                        className="btn rounded-lg px-2.5 py-1 text-xs"
                        onClick={() => {
                          const replay = replayOf(entry);
                          if (replay) setViewing({ replay, analyze: action === "analyze" });
                        }}
                      >
                        {action === "watch" ? "Watch" : "Analyze"}
                      </button>
                    ))}
                    <button
                      className="btn rounded-lg px-2.5 py-1 text-xs"
                      aria-label={`Delete game from ${dateLabel(entry.completedAt)}`}
                      onClick={() => {
                        deleteArchiveEntry(entry.id);
                        setGeneration((n) => n + 1);
                      }}
                    >
                      ✕
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ol>
          </>
        )}
      </Modal>

      <AnimatePresence>
        {viewing ? (
          <ReplayViewer
            replay={viewing.replay}
            autoAnalyze={viewing.analyze}
            startAt={viewing.startAt}
            onClose={() => setViewing(null)}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
