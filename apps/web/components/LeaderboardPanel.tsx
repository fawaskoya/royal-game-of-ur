"use client";

import { useEffect, useState } from "react";
import { fetchLeaderboard, type LeaderboardRow } from "@/lib/multiplayer/onlineIdentity";
import { Modal } from "./ui/Modal";

/**
 * The casual-pool ladder — real server-side Elo from finished online games.
 * Reads are plain RLS-gated selects; only the game server ever writes.
 */
export function LeaderboardPanel({ open, onClose }: { open: boolean; onClose(): void }) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRows(null);
    setError(null);
    fetchLeaderboard(20)
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "could not load the ladder"));
  }, [open]);

  return (
    <Modal
      open={open}
      title="Leaderboard"
      onClose={onClose}
      actions={
        <button className="btn rounded-lg px-4 py-2 text-sm" onClick={onClose}>
          Done
        </button>
      }
    >
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {!error && rows === null ? <p className="text-sm text-[var(--ink-dim)]">Consulting the scribes…</p> : null}
      {rows !== null && rows.length === 0 ? (
        <p className="text-sm text-[var(--ink-dim)]">
          No rated games yet — finish an online game and the ladder begins with you.
        </p>
      ) : null}
      {rows !== null && rows.length > 0 ? (
        <div className="flex flex-col gap-1">
          {rows.map((row, i) => (
            <div
              key={`${row.handle}-${i}`}
              className={[
                "flex items-center justify-between rounded-lg px-3 py-1.5 text-sm",
                row.isMe ? "bg-[var(--gold-faint)] ring-1 ring-[var(--gold-soft)]" : "",
              ].join(" ")}
            >
              <span className="flex items-center gap-2.5">
                <span className="w-6 text-right font-mono text-xs text-[var(--ink-dim)]">{i + 1}.</span>
                <span className={row.isMe ? "text-[var(--gold)]" : "text-[var(--ink)]"}>
                  {row.handle}
                  {row.isMe ? " (you)" : ""}
                </span>
              </span>
              <span className="flex items-baseline gap-2">
                <span className="font-display text-base text-[var(--gold)]">{row.rating}</span>
                <span className="text-xs text-[var(--ink-dim)]">
                  {row.games} game{row.games === 1 ? "" : "s"}
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <p className="mt-3 text-xs text-[var(--ink-dim)]">
        Elo from finished online games, rolled by the server. Play in a private room to enter.
      </p>
    </Modal>
  );
}
