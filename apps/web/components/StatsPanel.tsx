"use client";

import { useMemo, useState } from "react";
import { DIFFICULTIES } from "@ur/ai";
import { clearResults, loadResults, summarizeStats } from "@/lib/stats/matchResults";
import { Modal } from "./ui/Modal";

function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function StatsPanel({ open, onClose }: { open: boolean; onClose(): void }) {
  const [generation, setGeneration] = useState(0);
  const summary = useMemo(() => {
    void generation; // recompute after Clear
    return open ? summarizeStats(loadResults()) : null;
  }, [open, generation]);

  if (!summary) return null;

  const rows: [string, string][] = [
    ["Games vs AI", String(summary.games)],
    ["Wins · Losses", `${summary.wins} · ${summary.losses}`],
    ["Win rate", summary.games > 0 ? `${Math.round(summary.winRate * 100)}%` : "—"],
    [
      "Streak (best)",
      `${summary.currentStreak > 0 ? "+" : ""}${summary.currentStreak} (${summary.bestStreak})`,
    ],
    ["Average turns", summary.games > 0 ? summary.averageTurns.toFixed(0) : "—"],
    ["Captures made · suffered", `${summary.capturesMade} · ${summary.capturesSuffered}`],
    ["Rosettes landed", String(summary.rosettesLanded)],
    ["Fastest win", formatMs(summary.fastestWinMs)],
    ["Fewest turns win", summary.fewestTurnsWin === null ? "—" : String(summary.fewestTurnsWin)],
  ];

  return (
    <Modal
      open={open}
      title="Your statistics"
      onClose={onClose}
      actions={
        <>
          <button
            className="btn rounded-lg px-3 py-2 text-xs"
            onClick={() => {
              clearResults();
              setGeneration((n) => n + 1);
            }}
          >
            Clear stats
          </button>
          <button className="btn btn-primary rounded-lg px-4 py-2 text-sm" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      {summary.games === 0 ? (
        <p>No finished games against the machine yet. Results are recorded when a game ends.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <span className="text-[var(--ink-dim)]">{label}</span>
                <span className="text-right text-[var(--ink)]">{value}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-widest text-[var(--ink-dim)]">
              By difficulty
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {DIFFICULTIES.filter((d) => summary.byDifficulty[d.id]).map((d) => {
                const bucket = summary.byDifficulty[d.id]!;
                return (
                  <div key={d.id} className="contents">
                    <span className="text-[var(--ink-dim)]">{d.label}</span>
                    <span className="text-right">
                      {bucket.wins}/{bucket.games} won
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
