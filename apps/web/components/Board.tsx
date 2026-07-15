"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getLayout, occupancy, type GameState, type Move, type PlayerId } from "@ur/engine";
import { RouteOverlay } from "./RouteOverlay";
import { useSettings } from "@/lib/settings";

/** Waypoint stepper (movement-agent): ms a piece rests on each intermediate
 *  square while walking a multi-square move, entry, or bear-off. */
const HOP_MS = 90;
/** Default piece spring — used whenever a piece is not mid-walk. */
const BASE_SPRING = { type: "spring", stiffness: 420, damping: 32 } as const;
/** Snappier per-hop spring while a piece is stepping through its route. */
const HOP_SPRING = { type: "spring", stiffness: 650, damping: 40 } as const;

type BoardCell = { row: number; col: number };

/** Displayed-cell override for the piece currently walking its route. */
interface PieceWalk {
  /** `${player}-${piece}`, matching each piece's stable overlay key. */
  key: string;
  player: PlayerId;
  piece: number;
  /** Intermediate + final squares to visit, in order (never the pool/finish). */
  cells: readonly BoardCell[];
  step: number;
}

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
          stroke="var(--rosette-ink)"
          strokeWidth="1.6"
          transform={`rotate(${angle} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="3.2" fill="var(--rosette-ink)" />
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
  /** Draw this player's full route as a track overlay (tutorial). */
  routeFor?: PlayerId | null;
}

/**
 * Pieces live in a dedicated overlay layer (not inside tiles). That way a
 * capture never remounts the capturer into the same cell the victim just left —
 * only the capturer's grid position updates (smooth move) and the captured
 * piece's layoutId flies to the pool in PlayerPanel.
 */
export function Board({ state, legal, canAct, onMove, orientation = "horizontal", hintMove, routeFor = null }: BoardProps) {
  const layout = useMemo(() => getLayout(state.ruleset), [state.ruleset]);
  const occ = useMemo(() => occupancy(state), [state]);
  const [hovered, setHovered] = useState<Move | null>(null);
  const vertical = orientation === "vertical";
  const { settings } = useSettings();

  // --- Waypoint stepper (movement-agent) -----------------------------------
  // Walks the mover through its intermediate squares instead of one straight
  // spring, so the route reads instead of teleporting. See the history
  // effect below for the guards (undo/scrub/restore/resync, interrupts,
  // reduced motion) that decide when this fires.
  const [walk, setWalk] = useState<PieceWalk | null>(null);
  const prevHistoryLengthRef = useRef(state.history.length);
  const hopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHopTimer = useCallback(() => {
    if (hopTimerRef.current !== null) {
      clearTimeout(hopTimerRef.current);
      hopTimerRef.current = null;
    }
  }, []);

  // Unmount safety net — decoupled from the history effect below on purpose:
  // that effect doesn't always return a cleanup (see its comments), so a
  // dedicated mount/unmount-only effect is the only place guaranteed to run
  // exactly once at teardown.
  useEffect(() => clearHopTimer, [clearHopTimer]);

  useEffect(() => {
    const prevLength = prevHistoryLengthRef.current;
    const nextLength = state.history.length;
    prevHistoryLengthRef.current = nextLength;

    // Undo, replay scrub, restore, resync (or any non-move-driven re-run,
    // e.g. a settings toggle) — don't infer a route from a discontinuous
    // history. Cancel whatever was walking and snap to the real state.
    if (nextLength - prevLength !== 1) {
      clearHopTimer();
      setWalk(null);
      return;
    }

    const event = state.history[nextLength - 1]!;
    // Only a move qualifies. A roll/pass — or a 1-square move, which has no
    // intermediate square to walk — isn't a reason to start a NEW walk, but
    // it must not cancel one already in flight from a prior move either.
    if (event.type !== "move") return;
    if (event.to - event.from < 2) return;

    const reducedMotion =
      settings.motion === "reduced" ||
      (typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (reducedMotion) return;

    const { player, piece, from, to } = event;
    // Entry (from=0) starts the walk at square 1 — the pool→board layoutId
    // flight lands there and continues on foot. Bear-off (to=finishIndex)
    // walks to the last square, then the piece departs.
    const startIdx = Math.max(from, 0) + 1;
    const endIdx = Math.min(to, layout.finishIndex - 1);
    const cells: BoardCell[] = [];
    for (let i = startIdx; i <= endIdx; i++) {
      const cell = layout.cellAt(player, i);
      if (cell) cells.push(cell);
    }
    if (cells.length === 0) return;

    // A new qualifying move interrupts any walk in progress: drop it
    // instantly (its piece is already at its real destination, so it just
    // stops overriding) and start the new one.
    clearHopTimer();
    const key = `${player}-${piece}`;
    setWalk({ key, player, piece, cells, step: 0 });

    let step = 0;
    const advance = () => {
      step += 1;
      if (step >= cells.length) {
        hopTimerRef.current = null;
        setWalk((current) => (current && current.key === key ? null : current));
        return;
      }
      setWalk((current) => (current && current.key === key ? { ...current, step } : current));
      hopTimerRef.current = setTimeout(advance, HOP_MS);
    };
    hopTimerRef.current = setTimeout(advance, HOP_MS);
  }, [state.history, layout, settings.motion, clearHopTimer]);
  // --- end waypoint stepper --------------------------------------------------

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

  // Path breadcrumbs (movement-agent): a small dot on the squares strictly
  // between from/to for the hovered and hinted move — the from square holds
  // the piece itself, and the to square already gets a target ring above.
  const crumbKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const move of [hovered, hintMove]) {
      if (!move) continue;
      const startIdx = Math.max(move.from, 0) + 1;
      const endIdx = move.to - 1;
      for (let i = startIdx; i <= endIdx; i++) {
        const key = layout.keyAt(move.player, i);
        if (key) keys.add(key);
      }
    }
    return keys;
  }, [hovered, hintMove, layout]);

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

  // On-board pieces as a flat list (stable identity per player/piece index).
  const boardPieces = useMemo(() => {
    const list: Array<{
      player: PlayerId;
      piece: number;
      row: number;
      col: number;
      key: string;
    }> = [];
    for (const player of [0, 1] as const) {
      state.positions[player].forEach((pathIndex, piece) => {
        if (pathIndex <= 0 || pathIndex >= layout.finishIndex) return;
        const cell = layout.cellAt(player, pathIndex);
        if (!cell) return;
        list.push({
          player,
          piece,
          row: cell.row,
          col: cell.col,
          key: `${player}-${piece}`,
        });
      });
    }
    return list;
  }, [state.positions, layout]);

  // Transpose row/col for the vertical (portrait) orientation; the engine's
  // row/col stay untouched so game-semantics checks below (e.g. shared lane)
  // keep meaning "the middle lane", not "the middle of the screen".
  const place = (row: number, col: number) =>
    vertical ? { gridRow: col + 1, gridColumn: row + 1 } : { gridRow: row + 1, gridColumn: col + 1 };

  const gridClass = [
    "grid h-full w-full gap-1 sm:gap-1.5",
    vertical ? "grid-cols-3 grid-rows-8" : "grid-cols-8 grid-rows-3",
  ].join(" ");

  return (
    <div
      className="board-frame board-frame--fit relative rounded-2xl p-2 sm:p-3"
      style={
        {
          "--bcols": vertical ? 3 : 8,
          "--brows": vertical ? 8 : 3,
          "--board-max-w": vertical ? "100cqw" : "56rem",
        } as React.CSSProperties
      }
    >
      {/* Tile layer — squares only, never hosts pieces */}
      <div
        className={gridClass}
        role="grid"
        aria-label="Royal Game of Ur board"
      >
        {layout.cells.map((info) => {
          const occupant = occ.get(info.key);
          const target = targets.get(info.key);
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
                crumbKeys.has(info.key) ? "tile-crumb" : "",
              ].join(" ")}
              style={place(info.cell.row, info.cell.col)}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                {info.rosette && !occupant ? <RosetteGlyph /> : null}
              </div>
            </div>
          );
        })}
        {/* Notch placeholders keep the grid shape honest. */}
        {[0, 2].flatMap((row) =>
          [4, 5].map((col) => <div key={`notch-${row}-${col}`} aria-hidden style={place(row, col)} />),
        )}
      </div>

      {/* Route track (tutorial): sits above tiles, below pieces. */}
      {routeFor !== null ? (
        <div className={["pointer-events-none absolute inset-0 p-2 sm:p-3"].join(" ")} aria-hidden>
          <RouteOverlay layout={layout} player={routeFor} vertical={vertical} />
        </div>
      ) : null}

      {/*
        Piece overlay — same grid metrics as the tile layer so place() aligns.
        Pieces keep a stable React identity across cells; only their grid
        position changes. On capture the capturer slides into the square and
        the victim's layoutId animates to the pool (PlayerPanel), without both
        vanishing from the contested tile.
      */}
      <div className={["pointer-events-none absolute inset-0 p-2 sm:p-3", gridClass].join(" ")} aria-hidden={false}>
        {boardPieces.map(({ player, piece, row, col, key }) => {
          const move = moveForPiece.get(`${player}-${piece}`);
          const interactive = canAct && move !== undefined && player === state.current;
          const cellKey = `${row},${col}`;
          const isHintPiece = hintPieceKey === cellKey && player === (hintMove?.player ?? -1);
          // Waypoint stepper: while this piece is walking its route, render
          // it at the current hop instead of its (already-final) engine cell.
          const isWalking = walk !== null && walk.key === key;
          const pos = isWalking ? walk!.cells[walk!.step]! : { row, col };

          return (
            <motion.button
              key={key}
              layoutId={`piece-${player}-${piece}`}
              layout
              transition={isWalking ? HOP_SPRING : BASE_SPRING}
              className={[
                "pointer-events-auto relative z-10 flex items-center justify-center rounded-md",
                isHintPiece ? "piece-hint" : "",
              ].join(" ")}
              style={{
                ...place(pos.row, pos.col),
                cursor: interactive ? "pointer" : "default",
              }}
              disabled={!interactive}
              onClick={() => move && onMove(move)}
              onMouseEnter={() => interactive && move && setHovered(move)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => interactive && move && setHovered(move)}
              onBlur={() => setHovered(null)}
              aria-label={
                interactive
                  ? `Move ${player === 0 ? "Light" : "Dark"} piece from square ${move!.from} to ${
                      move!.to === layout.finishIndex ? "home" : `square ${move!.to}`
                    }`
                  : `${player === 0 ? "Light" : "Dark"} piece`
              }
            >
              <PieceDisc player={player} movable={interactive} />
            </motion.button>
          );
        })}
        {/*
          Bear-off ghost: a walking piece whose path index has already
          reached finishIndex is excluded from boardPieces above, so nothing
          renders its layoutId. Keep it alive for the walk's duration so it
          steps across the last squares and departs instead of vanishing at
          `from`; sharing the layoutId means any future home/pool flight for
          this piece continues from wherever the walk ends.
        */}
        {walk !== null && !boardPieces.some((p) => p.key === walk.key) ? (
          <motion.div
            key={`walk-ghost-${walk.key}`}
            layoutId={`piece-${walk.key}`}
            layout
            transition={HOP_SPRING}
            className="pointer-events-none absolute z-10 flex items-center justify-center rounded-md"
            style={place(walk.cells[walk.step]!.row, walk.cells[walk.step]!.col)}
            aria-hidden
          >
            <PieceDisc player={walk.player} />
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
