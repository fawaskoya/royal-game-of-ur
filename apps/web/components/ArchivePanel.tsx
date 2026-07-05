"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { Replay } from "@ur/engine";
import { deleteArchiveEntry, loadArchive, replayOf, type ArchiveEntry } from "@/lib/archive";
import { Modal } from "./ui/Modal";
import { ReplayViewer } from "./ReplayViewer";

function entryLabel(entry: ArchiveEntry): string {
  const mode = entry.mode;
  const who =
    mode.kind === "pvp"
      ? "Two players"
      : mode.kind === "ai"
        ? `vs ${mode.difficulty}`
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
  const [viewing, setViewing] = useState<{ replay: Replay; analyze: boolean } | null>(null);
  const entries = useMemo(() => {
    void generation;
    return open ? [...loadArchive()].reverse() : [];
  }, [open, generation]);

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
        )}
      </Modal>

      <AnimatePresence>
        {viewing ? (
          <ReplayViewer
            replay={viewing.replay}
            autoAnalyze={viewing.analyze}
            onClose={() => setViewing(null)}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
