"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getLayout, occupancy, type GameState, type Move, type PlayerId } from "@ur/engine";

function RosetteGlyph() {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg viewBox="0 0 40 40" className="h-3/5 w-3/5 opacity-70" aria-hidden>
      {petals.map((angle) => (
        <ellipse
          key={angle}
          cx="20"
          cy="11"
          rx="4.5"
          ry="8"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="1.6"
          transform={`rotate(${angle} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="3.2" fill="var(--gold)" />
    </svg>
  );
}

export function PieceDisc({
  player,
  movable,
  small,
}: {
  player: PlayerId;
  movable?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={[
        "piece flex items-center justify-center",
        player === 0 ? "piece-light" : "piece-dark",
        movable ? "piece-movable" : "",
        small ? "h-4 w-4 sm:h-5 sm:w-5" : "h-[68%] w-[68%]",
      ].join(" ")}
    >
      {/* Shape marker so the sides differ by more than color (colorblind safety). */}
      {player === 0 ? (
        <div className="h-[22%] w-[22%] rounded-full" style={{ background: "var(--light-piece-edge)" }} />
      ) : (
        <div className="h-[38%] w-[38%] rounded-full border-[1.5px]" style={{ borderColor: "var(--dark-piece-edge)" }} />
      )}
    </div>
  );
}

export interface BoardProps {
  state: GameState;
  legal: readonly Move[];
  canAct: boolean;
  onMove(move: Move): void;
  /** "horizontal" (default): 8 cols × 3 rows, as the board is traditionally drawn.
   *  "vertical": transposed to 3 cols × 8 rows, to suit a portrait/tall layout. */
  orientation?: "horizontal" | "vertical";
  /** Hint-engine suggestion: its destination is ringed, its piece pulses. */
  hintMove?: Move | null;
}

export function Board({ state, legal, canAct, onMove, orientation = "horizontal", hintMove }: BoardProps) {
  const layout = useMemo(() => getLayout(state.ruleset), [state.ruleset]);
  const occ = useMemo(() => occupancy(state), [state]);
  const [hovered, setHovered] = useState<Move | null>(null);
  const vertical = orientation === "vertical";

  const moveForPiece = useMemo(() => {
    const map = new Map<string, Move>();
    for (const move of legal) map.set(`${move.player}-${move.piece}`, move);
    return map;
  }, [legal]);

  // Destination rings for the hovered/hinted move; "capture" when the square
  // holds an opponent piece.
  const targets = useMemo(() => {
    const map = new Map<string, "plain" | "capture">();
    for (const move of [hovered, hintMove]) {
      if (!move) continue;
      const key = layout.keyAt(move.player, move.to);
      if (!key) continue;
      const occupant = occ.get(key);
      map.set(key, occupant && occupant.player !== move.player ? "capture" : "plain");
    }
    return map;
  }, [hovered, hintMove, layout, occ]);

  // Quiet wash on the from/to squares of the most recent move.
  const lastMoveKeys = useMemo(() => {
    const keys = new Set<string>();
    for (let i = state.history.length - 1; i >= 0; i--) {
      const event = state.history[i]!;
      if (event.type === "move") {
        for (const index of [event.from, event.to]) {
          const key = layout.keyAt(event.player, index);
          if (key) keys.add(key);
        }
        break;
      }
      if (event.type === "roll") break; // a fresh roll clears the wash
    }
    return keys;
  }, [state.history, layout]);

  const hintPieceKey = hintMove && hintMove.from > 0 ? layout.keyAt(hintMove.player, hintMove.from) : null;

  // Transpose row/col for the vertical (portrait) orientation; the engine's
  // row/col stay untouched so game-semantics checks below (e.g. shared lane)
  // keep meaning "the middle lane", not "the middle of the screen".
  const place = (row: number, col: number) =>
    vertical ? { gridRow: col + 1, gridColumn: row + 1 } : { gridRow: row + 1, gridColumn: col + 1 };

  return (
    <div
      className="board-frame board-frame--fit rounded-2xl p-2 sm:p-3"
      style={
        {
          "--bcols": vertical ? 3 : 8,
          "--brows": vertical ? 8 : 3,
          "--board-max-w": vertical ? "22rem" : "56rem",
        } as React.CSSProperties
      }
    >
      <div
        className={[
          "grid h-full w-full gap-1 sm:gap-1.5",
          vertical ? "grid-cols-3 grid-rows-8" : "grid-cols-8 grid-rows-3",
        ].join(" ")}
        role="grid"
        aria-label="Royal Game of Ur board"
      >
        {layout.cells.map((info) => {
          const occupant = occ.get(info.key);
          const move = occupant ? moveForPiece.get(`${occupant.player}-${occupant.piece}`) : undefined;
          const interactive = canAct && move !== undefined && occupant?.player === state.current;
          const target = targets.get(info.key);
          const isHintPiece = hintPieceKey === info.key;
          const label = [
            info.rosette ? "rosette square" : "square",
            `row ${info.cell.row + 1}, column ${info.cell.col + 1}`,
            info.shared ? "(shared lane)" : "",
            occupant ? `occupied by ${occupant.player === 0 ? "Light" : "Dark"}` : "empty",
          ].join(" ");

          return (
            <div
              key={info.key}
              role="gridcell"
              aria-label={label}
              className={[
                "tile relative rounded-md",
                info.cell.row === 1 ? "tile-lane" : "",
                info.rosette ? "tile-rosette" : "",
                target === "capture" ? "tile-target-capture" : target === "plain" ? "tile-target" : "",
                !target && lastMoveKeys.has(info.key) ? "tile-last" : "",
              ].join(" ")}
              style={place(info.cell.row, info.cell.col)}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                {info.rosette && !occupant ? <RosetteGlyph /> : null}
              </div>
              {occupant ? (
                <motion.button
                  layoutId={`piece-${occupant.player}-${occupant.piece}`}
                  layout
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className={[
                    "absolute inset-0 flex items-center justify-center",
                    isHintPiece ? "piece-hint rounded-md" : "",
                  ].join(" ")}
                  style={{ cursor: interactive ? "pointer" : "default" }}
                  disabled={!interactive}
                  onClick={() => move && onMove(move)}
                  onMouseEnter={() => interactive && move && setHovered(move)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => interactive && move && setHovered(move)}
                  onBlur={() => setHovered(null)}
                  aria-label={
                    interactive
                      ? `Move ${occupant.player === 0 ? "Light" : "Dark"} piece from square ${move!.from} to ${
                          move!.to === layout.finishIndex ? "home" : `square ${move!.to}`
                        }`
                      : label
                  }
                >
                  <PieceDisc player={occupant.player} movable={interactive} />
                </motion.button>
              ) : null}
            </div>
          );
        })}
        {/* Notch placeholders keep the grid shape honest. */}
        {[0, 2].flatMap((row) =>
          [4, 5].map((col) => <div key={`notch-${row}-${col}`} aria-hidden style={place(row, col)} />),
        )}
      </div>
    </div>
  );
}
