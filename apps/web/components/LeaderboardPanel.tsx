"use client";

import { useEffect, useState } from "react";
import { fetchLeaderboard, type LeaderboardRow } from "@/lib/multiplayer/onlineIdentity";
import { Modal } from "./ui/Modal";

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Casual-pool ladder — real server-side Elo from finished online games
 * (matchmaking and private rooms). Reads are RLS-gated; only the game
 * server writes ratings.
 */
export function LeaderboardPanel({ open, onClose }: { open: boolean; onClose(): void }) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRows(null);
    setError(null);
    fetchLeaderboard(25)
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
          No rated games yet — finish an online match or private room and the ladder begins with you.
        </p>
      ) : null}
      {rows !== null && rows.length > 0 ? (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[18rem] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                <th className="px-1.5 py-1 font-normal">#</th>
                <th className="px-1.5 py-1 font-normal">Player</th>
                <th className="px-1.5 py-1 text-right font-normal">Elo</th>
                <th className="px-1.5 py-1 text-right font-normal">W–L</th>
                <th className="hidden px-1.5 py-1 text-right font-normal sm:table-cell">Win%</th>
                <th className="hidden px-1.5 py-1 text-right font-normal sm:table-cell">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.handle}-${row.rank}`}
                  className={row.isMe ? "bg-[var(--gold-faint)] ring-1 ring-inset ring-[var(--gold-soft)]" : ""}
                >
                  <td className="px-1.5 py-1.5 font-mono text-xs text-[var(--ink-dim)]">{row.rank}</td>
                  <td className={["max-w-[8rem] truncate px-1.5 py-1.5", row.isMe ? "text-[var(--gold)]" : ""].join(" ")}>
                    {row.handle}
                    {row.isMe ? " · you" : ""}
                  </td>
                  <td className="px-1.5 py-1.5 text-right font-display text-base text-[var(--gold)]">{row.rating}</td>
                  <td className="px-1.5 py-1.5 text-right tabular-nums text-xs text-[var(--ink-dim)]">
                    {row.wins + row.losses > 0 ? (
                      <>
                        <span className="text-[var(--ink)]">{row.wins}</span>
                        <span className="mx-0.5 opacity-50">–</span>
                        <span>{row.losses}</span>
                      </>
                    ) : (
                      <span title="Games before win tracking">{row.games}g</span>
                    )}
                  </td>
                  <td className="hidden px-1.5 py-1.5 text-right text-xs text-[var(--ink-dim)] sm:table-cell">
                    {row.winRate != null ? `${Math.round(row.winRate * 100)}%` : "—"}
                  </td>
                  <td className="hidden px-1.5 py-1.5 text-right text-xs text-[var(--ink-dim)] sm:table-cell">
                    {timeAgo(row.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-[var(--ink-dim)]">
        Casual Elo from finished online games (matchmaking & private rooms). Server rolls dice and
        updates ratings once per match. Win–loss counts from when tracking started.
      </p>
    </Modal>
  );
}
