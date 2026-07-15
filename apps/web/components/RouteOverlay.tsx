"use client";

import { useMemo } from "react";
import type { getLayout, PlayerId } from "@ur/engine";

/**
 * Visual race-track overlay: draws a player's full route (entry → own four →
 * shared lane → last two → home) as a directional path over the board grid,
 * so first-timers can SEE the road instead of inferring it from piece jumps
 * (direct Reddit feedback: "no idea where the start was, or what path I
 * followed to the exit").
 *
 * Mounted from Board.tsx via the `routeFor` prop, inside the board frame
 * between the tile layer and the piece layer.
 *
 * Built as its OWN grid using the same gapped grid-cols/-rows + place()
 * transpose as Board.tsx, rather than one stretched SVG — the board's
 * gap-1/1.5 gutters mean a single fractional-coordinate overlay would drift
 * off cell centers. A per-cell marker is gap-proof and orientation-proof.
 */
export interface RouteOverlayProps {
  layout: ReturnType<typeof getLayout>;
  player: PlayerId;
  /** Board is rendered transposed (3×8 portrait) when true. */
  vertical: boolean;
}

interface RouteStep {
  index: number;
  gridRow: number;
  gridColumn: number;
  /** Degrees to rotate the "point right" glyph so it faces the next square. */
  rotation: number;
  rosette: boolean;
  isFirst: boolean;
  isLast: boolean;
}

/** Same transpose Board.tsx's place() uses — engine (row,col) to CSS grid line numbers. */
function place(row: number, col: number, vertical: boolean) {
  return vertical ? { gridRow: col + 1, gridColumn: row + 1 } : { gridRow: row + 1, gridColumn: col + 1 };
}

function buildSteps(layout: RouteOverlayProps["layout"], player: PlayerId, vertical: boolean): RouteStep[] {
  const cells: Array<{ row: number; col: number }> = [];
  for (let index = 1; index <= layout.pathLength; index++) {
    const cell = layout.cellAt(player, index);
    if (cell) cells.push(cell);
  }

  return cells.map((cell, k) => {
    const index = k + 1;
    const isLast = k === cells.length - 1;
    // Normal cells point at the next cell; the last cell has no "next" on the
    // board, so it continues the heading of the step that led into it.
    const from = isLast ? cells[k - 1]! : cell;
    const to = isLast ? cell : cells[k + 1]!;
    const delta = { dRow: to.row - from.row, dCol: to.col - from.col };
    // Rotating the position mapping the same way place() does turns an
    // engine-space heading into a screen-space one, in both orientations.
    const gridDelta = vertical ? { dRow: delta.dCol, dCol: delta.dRow } : delta;
    const rotation = (Math.atan2(gridDelta.dRow, gridDelta.dCol) * 180) / Math.PI;
    const pos = place(cell.row, cell.col, vertical);

    return {
      index,
      gridRow: pos.gridRow,
      gridColumn: pos.gridColumn,
      rotation,
      rosette: layout.isRosette(player, index),
      isFirst: index === 1,
      isLast,
    };
  });
}

/**
 * One route marker: a chevron rotated to face the next square. The entry
 * square adds a dashed "start" ring; the exit square doubles the chevron
 * instead of shrinking for its rosette (the flower glyph sits underneath, in
 * the tile layer — a thin gold double-chevron over it reads as a road sign,
 * not clutter, since both use --rosette-ink).
 */
function RouteGlyph({
  rotation,
  isFirst,
  isLast,
  rosette,
}: {
  rotation: number;
  isFirst: boolean;
  isLast: boolean;
  rosette: boolean;
}) {
  // Mid-route rosettes (index 4, 8 for Light) shrink so they don't fight the
  // board's own flower glyph; the entry/exit squares stay full strength even
  // when they land on a rosette (index 14 is both "last" and a rosette).
  const shrink = rosette && !isFirst && !isLast;
  const sizeClass = isFirst || isLast ? "h-[56%] w-[56%]" : shrink ? "h-[26%] w-[26%]" : "h-[40%] w-[40%]";
  const baseOpacity = isFirst || isLast ? 0.85 : shrink ? 0.5 : 0.7;
  const goldWidth = isFirst || isLast ? 5 : 4;
  // Gold alone at partial opacity sinks into the ivory tiles — an "engraved"
  // dark under-stroke beneath each gold stroke keeps the trail legible on any
  // tile color/skin without turning it garish.
  const underInk = "rgba(43, 36, 22, 0.5)";

  return (
    <svg viewBox="0 0 40 40" className={["route-glyph", sizeClass].join(" ")} aria-hidden focusable="false">
      {isFirst ? (
        <circle
          cx="20"
          cy="20"
          r="15"
          fill="none"
          stroke="var(--rosette-ink)"
          strokeWidth="2.5"
          strokeDasharray="3 3.5"
          opacity={baseOpacity * 0.85}
        />
      ) : null}
      <g transform={`rotate(${rotation} 20 20)`} opacity={baseOpacity}>
        <path
          d="M13 9 L26 20 L13 31"
          fill="none"
          stroke={underInk}
          strokeWidth={goldWidth + 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13 9 L26 20 L13 31"
          fill="none"
          stroke="var(--rosette-ink)"
          strokeWidth={goldWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {isLast ? (
          <>
            <path
              d="M22 9 L35 20 L22 31"
              fill="none"
              stroke={underInk}
              strokeWidth={goldWidth + 1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M22 9 L35 20 L22 31"
              fill="none"
              stroke="var(--rosette-ink)"
              strokeWidth={goldWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : null}
      </g>
    </svg>
  );
}

export function RouteOverlay({ layout, player, vertical }: RouteOverlayProps) {
  const steps = useMemo(() => buildSteps(layout, player, vertical), [layout, player, vertical]);

  const gridClass = [
    "grid h-full w-full gap-1 sm:gap-1.5",
    vertical ? "grid-cols-3 grid-rows-8" : "grid-cols-8 grid-rows-3",
  ].join(" ");

  return (
    <div className={gridClass} aria-hidden>
      {steps.map((step) => (
        <div
          key={step.index}
          className="relative flex items-center justify-center overflow-hidden"
          style={{ gridRow: step.gridRow, gridColumn: step.gridColumn }}
        >
          <RouteGlyph rotation={step.rotation} isFirst={step.isFirst} isLast={step.isLast} rosette={step.rosette} />
        </div>
      ))}
    </div>
  );
}
