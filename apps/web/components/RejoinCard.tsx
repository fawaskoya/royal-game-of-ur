"use client";

import { useEffect, useState } from "react";
import { loadActiveGame, type ActiveOnlineGame } from "@/lib/multiplayer/activeGame";

/**
 * Offers a way back into an online game left mid-play — the recovery path
 * for a refresh, an accidental tab close, or a mobile browser evicting the
 * tab. Renders nothing when there is no game to return to.
 */
export function RejoinCard({ onRejoin }: { onRejoin(game: ActiveOnlineGame): void }) {
  const [game, setGame] = useState<ActiveOnlineGame | null>(null);

  // localStorage is read after mount so the server render and the first
  // client render agree (no hydration mismatch).
  useEffect(() => setGame(loadActiveGame()), []);

  if (!game) return null;
  return (
    <button
      className="card card--gilded w-full rounded-xl px-4 py-3 text-left"
      onClick={() => onRejoin(game)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-[var(--gold)]">Rejoin your game</div>
          <div className="mt-0.5 truncate text-xs text-[var(--ink-dim)]">
            {game.code ? `Room ${game.code}` : "Matchmade game"} · still in progress
          </div>
        </div>
        <span aria-hidden className="font-display text-lg text-[var(--gold)]">
          ›
        </span>
      </div>
    </button>
  );
}
