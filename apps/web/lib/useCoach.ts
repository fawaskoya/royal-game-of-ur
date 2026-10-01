"use client";

import { useEffect, useMemo, useState } from "react";
import { hintFor } from "@ur/ai";
import type { GameState, Move, PlayerId } from "@ur/engine";
import { COACH_MAX_GAMES, openingTip } from "@/lib/coach";
import { loadResults } from "@/lib/stats/matchResults";

/**
 * Opening-coach tip for `player`'s next move: text plus the move to ring on
 * the board. Only a new player (fewer than COACH_MAX_GAMES finished games)
 * ever pays for the search, and only on their first three moves.
 */
export function useCoach(
  state: GameState,
  player: PlayerId | null,
  enabled: boolean,
): { tip: string | null; move: Move | null } {
  const [newbie, setNewbie] = useState(false);
  useEffect(() => {
    setNewbie(loadResults().length < COACH_MAX_GAMES);
  }, []);

  return useMemo(() => {
    if (!enabled || !newbie || player === null) return { tip: null, move: null };
    const tip = openingTip(state, player);
    if (tip === null) return { tip: null, move: null };
    return { tip, move: hintFor(state, { depth: 2 })?.move ?? null };
  }, [enabled, newbie, player, state]);
}
