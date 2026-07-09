"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { finishedCount, getLayout, type GameState, type Move, type PlayerId } from "@ur/engine";
import { PieceDisc } from "./Board";
import type { Controller } from "@/lib/useGame";

export interface PlayerPanelProps {
  state: GameState;
  player: PlayerId;
  controller: Controller;
  active: boolean;
  /** The entry move for this player, if one is currently legal and playable. */
  entryMove: Move | null;
  canAct: boolean;
  onMove(move: Move): void;
  /**
   * `rail` — narrow side column (mobile portrait / flanked board).
   * `default` — full-width stacked panel.
   */
  variant?: "default" | "rail";
}

export function PlayerPanel({
  state,
  player,
  controller,
  active,
  entryMove,
  canAct,
  onMove,
  variant = "default",
}: PlayerPanelProps) {
  const layout = getLayout(state.ruleset);
  const name = player === 0 ? "Light" : "Dark";
  const home = finishedCount(state, player);
  const entryPlayable = canAct && entryMove !== null;

  const poolPieces: number[] = [];
  let onBoard = 0;
  state.positions[player].forEach((index, piece) => {
    if (index === 0) poolPieces.push(piece);
    else if (index !== layout.finishIndex) onBoard++;
  });

  const captures = useMemo(
    () => state.history.filter((e) => e.type === "move" && e.player === player && e.capture).length,
    [state.history, player],
  );

  if (variant === "rail") {
    return (
      <div
        className={[
          "player-panel player-panel--rail flex h-full min-h-0 flex-col items-center justify-between gap-1 rounded-xl border px-1 py-1.5",
          active
            ? "player-panel--active border-[var(--frame-edge)] bg-[var(--bg-raised)] ring-1 ring-[var(--gold-soft)]"
            : "border-transparent bg-[var(--bg-raised)]/40",
        ].join(" ")}
      >
        <div className="flex flex-col items-center gap-0.5 text-center">
          <PieceDisc player={player} small />
          <span className="font-display text-[11px] leading-none">{name}</span>
          <span className="chip scale-90 text-[9px]">{controller === "human" ? "You" : controller}</span>
          {active ? <span className="text-[9px] text-[var(--gold)]">play</span> : null}
        </div>

        <button
          type="button"
          className={[
            "piece-pool flex max-h-[45%] min-h-0 flex-col flex-wrap items-center justify-center gap-0.5 overflow-y-auto rounded-lg px-0.5 py-1",
            entryPlayable ? "piece-pool--selectable cursor-pointer" : "cursor-default",
          ].join(" ")}
          disabled={!entryPlayable}
          onClick={() => entryMove && onMove(entryMove)}
          aria-label={
            entryPlayable
              ? `Enter a new ${name} piece onto square ${entryMove!.to}`
              : `${name} start pool: ${poolPieces.length} pieces waiting`
          }
        >
          {poolPieces.map((piece) => (
            <motion.div
              key={piece}
              layoutId={`piece-${player}-${piece}`}
              layout
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            >
              <PieceDisc player={player} small movable={entryPlayable} />
            </motion.div>
          ))}
          {poolPieces.length === 0 ? (
            <span className="px-0.5 text-[9px] text-[var(--ink-dim)]">—</span>
          ) : null}
        </button>

        <div className="flex flex-col items-center gap-0.5 text-center">
          <div aria-label={`${name} has borne off ${home} of ${state.ruleset.piecesPerPlayer}`}>
            <span className="font-display text-sm leading-none text-[var(--gold)]">{home}</span>
            <span className="block text-[8px] uppercase tracking-wider text-[var(--ink-dim)]">
              /{state.ruleset.piecesPerPlayer}
            </span>
          </div>
          <span className="text-[9px] text-[var(--ink-dim)]" title="On board">
            {onBoard}·⚔{captures}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "player-panel flex flex-col gap-1.5 rounded-xl border px-3 py-2 sm:px-4",
        active
          ? "player-panel--active border-[var(--frame-edge)] bg-[var(--bg-raised)] ring-1 ring-[var(--gold-soft)]"
          : "border-transparent bg-[var(--bg-raised)]/40",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <PieceDisc player={player} small />
          <div className="flex items-baseline gap-2">
            <span className="font-display text-sm sm:text-base">{name}</span>
            <span className="chip">{controller === "human" ? "Human" : controller}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {active ? <span className="text-xs text-[var(--gold)]">to play</span> : null}
          <div
            className="text-right"
            aria-label={`${name} has borne off ${home} of ${state.ruleset.piecesPerPlayer} pieces`}
          >
            <span className="font-display text-lg leading-none text-[var(--gold)]">{home}</span>
            <span className="ml-1 text-[10px] uppercase tracking-widest text-[var(--ink-dim)]">
              / {state.ruleset.piecesPerPlayer} home
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className={[
            "piece-pool flex min-h-6 items-center gap-1 rounded-lg px-1.5 py-1.5 transition-[box-shadow,background-color] duration-150",
            entryPlayable ? "piece-pool--selectable cursor-pointer" : "cursor-default",
          ].join(" ")}
          disabled={!entryPlayable}
          onClick={() => entryMove && onMove(entryMove)}
          aria-label={
            entryPlayable
              ? `Enter a new ${name} piece onto square ${entryMove!.to}`
              : `${name} start pool: ${poolPieces.length} pieces waiting`
          }
        >
          {poolPieces.map((piece) => (
            <motion.div
              key={piece}
              layoutId={`piece-${player}-${piece}`}
              layout
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            >
              <PieceDisc player={player} small movable={entryPlayable} />
            </motion.div>
          ))}
          {poolPieces.length === 0 ? (
            <span className="px-1 text-xs text-[var(--ink-dim)]">pool empty</span>
          ) : null}
        </button>

        <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-dim)]">
          <span className="chip" aria-label={`${onBoard} pieces on the board`}>
            {onBoard} on board
          </span>
          <span className="chip" aria-label={`${captures} captures made`}>
            <span aria-hidden>⚔</span> {captures}
          </span>
        </div>
      </div>
    </div>
  );
}
