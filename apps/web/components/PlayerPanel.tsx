"use client";

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
}

export function PlayerPanel({ state, player, controller, active, entryMove, canAct, onMove }: PlayerPanelProps) {
  const layout = getLayout(state.ruleset);
  const name = player === 0 ? "Light" : "Dark";
  const who = controller === "human" ? "" : ` · ${controller}`;
  const home = finishedCount(state, player);
  const entryPlayable = canAct && entryMove !== null;

  const poolPieces: number[] = [];
  const homePieces: number[] = [];
  state.positions[player].forEach((index, piece) => {
    if (index === 0) poolPieces.push(piece);
    if (index === layout.finishIndex) homePieces.push(piece);
  });

  return (
    <div
      className={[
        "player-panel flex items-center justify-between gap-3 rounded-xl px-3 py-2 sm:px-4",
        active ? "bg-[var(--bg-raised)] ring-1 ring-[var(--gold-soft)]" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5">
        <PieceDisc player={player} small />
        <div>
          <div className="font-display text-sm sm:text-base">
            {name}
            <span className="text-[var(--ink-dim)]">{who}</span>
          </div>
          {active ? <div className="text-xs text-[var(--gold)]">to play</div> : null}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <button
          className={[
            "flex min-h-6 items-center gap-1 rounded-lg px-1.5 py-1",
            entryPlayable ? "cursor-pointer ring-1 ring-[var(--gold)]" : "cursor-default",
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

        <div className="text-right" aria-label={`${name} has borne off ${home} of ${state.ruleset.piecesPerPlayer} pieces`}>
          <div className="font-display text-lg leading-none text-[var(--gold)]">{home}</div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--ink-dim)]">home</div>
        </div>
      </div>
    </div>
  );
}
