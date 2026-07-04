"use client";

import { motion } from "framer-motion";
import type { GameEvent, GameState } from "@ur/engine";

function Die({ value, dim }: { value: 0 | 1; dim: boolean }) {
  return (
    <div
      className={[
        "die flex h-8 w-8 rotate-45 items-center justify-center rounded-[6px] border sm:h-9 sm:w-9",
        dim ? "opacity-45" : "",
      ].join(" ")}
      style={{ borderColor: "var(--frame-edge)", background: "linear-gradient(150deg, #efe6cf, #cfc19d)" }}
      aria-hidden
    >
      {value === 1 ? <div className="h-2 w-2 -rotate-45 rounded-full bg-[#211906]" /> : null}
    </div>
  );
}

export interface DiceTrayProps {
  state: GameState;
  tail: readonly GameEvent[];
  aiTurn: boolean;
  humanCanRoll: boolean;
  humanCanMove: boolean;
  onRoll(): void;
}

export function DiceTray({ state, tail, aiTurn, humanCanRoll, humanCanMove, onRoll }: DiceTrayProps) {
  // Show the pending roll, or keep the last throw visible for context.
  const lastRollEvent = [...state.history].reverse().find((e) => e.type === "roll");
  const values = state.dice?.values ?? lastRollEvent?.values ?? null;
  const total = state.dice?.total ?? lastRollEvent?.total ?? null;
  const stale = state.dice === null;

  const lastMove = tail.find((e) => e.type === "move");
  const passed = tail.find((e) => e.type === "pass");
  const currentName = state.current === 0 ? "Light" : "Dark";

  let status: string;
  if (state.winner !== null) status = `${state.winner === 0 ? "Light" : "Dark"} wins`;
  else if (passed) status = passed.reason === "rolled-zero" ? "Rolled zero — turn passes" : "No legal moves — turn passes";
  else if (lastMove?.extraTurn) status = `Rosette! ${currentName} rolls again`;
  else if (aiTurn) status = `${currentName} is thinking…`;
  else if (humanCanRoll) status = `${currentName} to roll`;
  else if (humanCanMove) status = `${currentName} to move — pick a glowing piece`;
  else status = `${currentName} to play`;

  return (
    <div className="dice-tray flex flex-col gap-2.5 rounded-xl bg-[var(--bg-raised)] px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 px-1 sm:gap-3">
            {(values ?? [0, 0, 0, 0]).map((value, i) => (
              <motion.div
                key={`${state.rollCount}-${i}`}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 500, damping: 24 }}
              >
                <Die value={value as 0 | 1} dim={stale || values === null} />
              </motion.div>
            ))}
          </div>
          <div
            className={["roll-total font-display w-8 text-center text-2xl", stale ? "text-[var(--ink-dim)]" : "text-[var(--gold)]"].join(" ")}
            aria-label={total === null ? "no roll yet" : `rolled ${total}`}
          >
            {total ?? "–"}
          </div>
        </div>

        <button
          className={["btn btn-primary rounded-lg px-5 py-2 text-sm", humanCanRoll ? "pulse-gold" : ""].join(" ")}
          disabled={!humanCanRoll}
          onClick={onRoll}
          aria-keyshortcuts="r"
        >
          Roll
        </button>
      </div>

      <div className="text-sm text-[var(--ink-dim)]" role="status">
        {status}
      </div>
    </div>
  );
}
