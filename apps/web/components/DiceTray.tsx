"use client";

import { motion } from "framer-motion";
import type { GameEvent, GameState } from "@ur/engine";

function Die({ value, dim, index }: { value: 0 | 1; dim: boolean; index: number }) {
  return (
    <motion.div
      // The result is already decided by the engine — the tumble is pure
      // presentation. Reduced motion (MotionConfig user) renders it instantly.
      initial={{ rotate: 0, scale: 0.55, opacity: 0 }}
      animate={{ rotate: 360, scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 260, damping: 17 }}
      className={[
        "die flex h-8 w-8 rotate-45 items-center justify-center rounded-[6px] border sm:h-9 sm:w-9",
        dim ? "opacity-45" : "",
      ].join(" ")}
      style={{ borderColor: "var(--frame-edge)", background: "linear-gradient(150deg, #efe6cf, #cfc19d)" }}
      aria-hidden
    >
      {value === 1 ? <div className="h-2 w-2 -rotate-45 rounded-full bg-[#211906]" /> : null}
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
  onRoll(): void;
}

export function DiceTray({ state, tail, aiTurn, humanCanRoll, humanCanMove, hintText, onHint, onRoll }: DiceTrayProps) {
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
            {(values ?? [0, 0, 0, 0]).map((value, i) => (
              <Die
                key={`${state.rollCount}-${i}`}
                value={value as 0 | 1}
                dim={stale || values === null}
                index={i}
              />
            ))}
          </div>
          <motion.div
            key={`total-${state.rollCount}`}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.28, type: "spring", stiffness: 400, damping: 20 }}
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
