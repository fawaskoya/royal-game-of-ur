"use client";

import { motion } from "framer-motion";
import type { GameEvent, GameState } from "@ur/engine";
import type { Settings } from "@/lib/settings";

type DiceSpeed = Settings["diceSpeed"];

/** Per-speed tumble parameters. Rotation is always a whole multiple of 360°
 * so every die settles upright regardless of how many turns it takes.
 * "instant" keeps the element (for layout/key stability) but with no
 * visible motion — everything else is identical. */
const SPEED_CONFIG: Record<DiceSpeed, { rotate: number; stiffness: number; damping: number; delayStep: number }> = {
  physics: { rotate: 720, stiffness: 260, damping: 17, delayStep: 0.07 },
  quick: { rotate: 360, stiffness: 500, damping: 30, delayStep: 0.025 },
  instant: { rotate: 0, stiffness: 1000, damping: 60, delayStep: 0 },
};

/** Shared gradient defs for all dice on the page — rendered once so multiple
 * <Die> instances don't each declare colliding duplicate element ids. */
function DieGradients() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        <linearGradient id="dieFaceLight" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#f6eed8" />
          <stop offset="100%" stopColor="#cdbb90" />
        </linearGradient>
        <linearGradient id="dieFaceDark" x1="1" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#e2d1a5" />
          <stop offset="100%" stopColor="#a4926a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** A simple two-face pyramid silhouette — a tasteful, legible stand-in for a
 * tetrahedral die (true 3D pip layout isn't worth the complexity at this size). */
function Die({ value, dim, index, speed }: { value: 0 | 1; dim: boolean; index: number; speed: DiceSpeed }) {
  const cfg = SPEED_CONFIG[speed];
  return (
    <motion.div
      // The result is already decided by the engine — the tumble is pure
      // presentation. Reduced motion (MotionConfig user) renders it instantly.
      initial={{ rotate: 0, scale: 0.55, opacity: 0 }}
      animate={{ rotate: cfg.rotate, scale: 1, opacity: 1 }}
      transition={{ delay: index * cfg.delayStep, type: "spring", stiffness: cfg.stiffness, damping: cfg.damping }}
      className={["die h-8 w-8 sm:h-9 sm:w-9", dim ? "opacity-45" : ""].join(" ")}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" className="h-full w-full drop-shadow-sm">
        <polygon points="20,4 6,36 20,36" fill="url(#dieFaceLight)" stroke="var(--frame-edge)" strokeWidth="1.4" strokeLinejoin="round" />
        <polygon points="20,4 34,36 20,36" fill="url(#dieFaceDark)" stroke="var(--frame-edge)" strokeWidth="1.4" strokeLinejoin="round" />
        {value === 1 ? <circle cx="20" cy="26" r="2.8" fill="#211906" /> : null}
      </svg>
    </motion.div>
  );
}

export interface DiceTrayProps {
  state: GameState;
  tail: readonly GameEvent[];
  aiTurn: boolean;
  humanCanRoll: boolean;
  humanCanMove: boolean;
  /** Hint reason line, shown under the status when a hint is active. */
  hintText?: string | null;
  /** Omit to hide the hint button (e.g. watch mode). */
  onHint?: () => void;
  diceSpeed?: DiceSpeed;
  onRoll(): void;
}

export function DiceTray({
  state,
  tail,
  aiTurn,
  humanCanRoll,
  humanCanMove,
  hintText,
  onHint,
  diceSpeed = "physics",
  onRoll,
}: DiceTrayProps) {
  // Show the pending roll, or keep the last throw visible for context.
  const lastRollEvent = [...state.history].reverse().find((e) => e.type === "roll");
  const values = state.dice?.values ?? lastRollEvent?.values ?? null;
  const total = state.dice?.total ?? lastRollEvent?.total ?? null;
  const stale = state.dice === null;

  const lastMove = tail.find((e) => e.type === "move");
  const passed = tail.find((e) => e.type === "pass");
  const currentName = state.current === 0 ? "Light" : "Dark";

  let status: string;
  let emphasis = false;
  if (state.winner !== null) status = `${state.winner === 0 ? "Light" : "Dark"} wins`;
  else if (passed) status = passed.reason === "rolled-zero" ? "Rolled zero — turn passes" : "No legal moves — turn passes";
  else if (lastMove?.extraTurn) {
    status = `Rosette! ${currentName} rolls again`;
    emphasis = true;
  } else if (lastMove?.capture) {
    status = `Captured! ${currentName} to play`;
    emphasis = true;
  } else if (aiTurn) status = `${currentName} is thinking…`;
  else if (humanCanRoll) status = `${currentName} to roll`;
  else if (humanCanMove) status = `${currentName} to move — pick a glowing piece`;
  else status = `${currentName} to play`;

  return (
    <div className="dice-tray flex flex-col gap-2.5 rounded-xl bg-[var(--bg-raised)] px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="dice-row flex items-center gap-2.5 px-1 sm:gap-3">
            <DieGradients />
            {(values ?? [0, 0, 0, 0]).map((value, i) => (
              <Die
                key={`${state.rollCount}-${i}`}
                value={value as 0 | 1}
                dim={stale || values === null}
                index={i}
                speed={diceSpeed}
              />
            ))}
          </div>
          <motion.div
            key={`total-${state.rollCount}`}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: diceSpeed === "instant" ? 0 : diceSpeed === "quick" ? 0.12 : 0.28,
              type: "spring",
              stiffness: 400,
              damping: 20,
            }}
            className={[
              "roll-total font-display w-8 text-center text-2xl",
              stale ? "text-[var(--ink-dim)]" : "text-[var(--gold)]",
            ].join(" ")}
            aria-label={total === null ? "no roll yet" : `rolled ${total}`}
          >
            {total ?? "–"}
          </motion.div>
        </div>

        <div className="flex items-center gap-2">
          {onHint ? (
            <button
              className="btn rounded-lg px-3 py-2 text-sm"
              disabled={!humanCanMove}
              onClick={onHint}
              aria-keyshortcuts="h"
              title="Suggest a move (H)"
            >
              Hint
            </button>
          ) : null}
          <button
            className={["btn btn-primary rounded-lg px-5 py-2 text-sm", humanCanRoll ? "pulse-gold" : ""].join(" ")}
            disabled={!humanCanRoll}
            onClick={onRoll}
            aria-keyshortcuts="r"
          >
            Roll
          </button>
        </div>
      </div>

      <div
        className={["text-sm", emphasis ? "text-[var(--gold)]" : "text-[var(--ink-dim)]"].join(" ")}
        role="status"
      >
        {status}
        {hintText ? <span className="ml-2 text-[var(--gold)]">· {hintText}</span> : null}
      </div>
    </div>
  );
}
