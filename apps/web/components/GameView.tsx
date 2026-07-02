"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "framer-motion";
import type { GameEvent } from "@ur/engine";
import { controllerOf, useGame, type GameMode } from "@/lib/useGame";
import { Board } from "./Board";
import { PlayerPanel } from "./PlayerPanel";
import { DiceTray } from "./DiceTray";

function describe(event: GameEvent): string {
  const who = event.player === 0 ? "Light" : "Dark";
  switch (event.type) {
    case "roll":
      return `${who} rolled ${event.total}.`;
    case "pass":
      return `${who} ${event.reason === "rolled-zero" ? "rolled a zero" : "had no legal moves"}; turn passes.`;
    case "move":
      return [
        `${who} ${event.from === 0 ? "entered a piece" : `moved from square ${event.from}`} ${
          event.finished ? "home" : `to square ${event.to}`
        }.`,
        event.capture ? "Captured an opponent piece." : "",
        event.extraTurn ? "Rosette: rolls again." : "",
      ]
        .filter(Boolean)
        .join(" ");
  }
}

export function GameView({ mode, onExit }: { mode: GameMode; onExit(): void }) {
  const game = useGame(mode);
  const { state, legal, tail } = game;

  const entryMoves = useMemo(
    () => ({
      0: legal.find((m) => m.player === 0 && m.from === 0) ?? null,
      1: legal.find((m) => m.player === 1 && m.from === 0) ?? null,
    }),
    [legal],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey && !e.altKey) game.roll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game]);

  const passToast = tail.find((e) => e.type === "pass");

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-3 px-3 py-4 sm:gap-4 sm:py-6">
        <header className="flex items-center justify-between">
          <button className="btn rounded-lg px-3 py-1.5 text-sm" onClick={onExit}>
            ‹ Menu
          </button>
          <h1 className="font-display text-lg tracking-wide text-[var(--gold)] sm:text-xl">Royal Game of Ur</h1>
          <div className="flex gap-2">
            <button className="btn rounded-lg px-3 py-1.5 text-sm" disabled={!game.canUndo} onClick={game.undo}>
              Undo
            </button>
            <button className="btn rounded-lg px-3 py-1.5 text-sm" onClick={game.newGame}>
              New
            </button>
          </div>
        </header>

        <LayoutGroup>
          <PlayerPanel
            state={state}
            player={1}
            controller={controllerOf(mode, 1)}
            active={state.winner === null && state.current === 1}
            entryMove={state.current === 1 ? entryMoves[1] : null}
            canAct={game.humanCanMove && state.current === 1}
            onMove={game.movePiece}
          />

          <div className="relative">
            <Board state={state} legal={legal} canAct={game.humanCanMove} onMove={game.movePiece} />
            <AnimatePresence>
              {passToast ? (
                <motion.div
                  key={state.history.length}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center"
                >
                  <div className="rounded-full border border-[var(--frame-edge)] bg-[var(--bg-raised)]/95 px-4 py-2 text-sm">
                    {passToast.reason === "rolled-zero" ? "Zero — turn passes" : "No legal moves — turn passes"}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <PlayerPanel
            state={state}
            player={0}
            controller={controllerOf(mode, 0)}
            active={state.winner === null && state.current === 0}
            entryMove={state.current === 0 ? entryMoves[0] : null}
            canAct={game.humanCanMove && state.current === 0}
            onMove={game.movePiece}
          />
        </LayoutGroup>

        <DiceTray
          state={state}
          tail={tail}
          aiTurn={game.aiTurn}
          humanCanRoll={game.humanCanRoll}
          humanCanMove={game.humanCanMove}
          onRoll={game.roll}
        />

        {/* Screen-reader narration of every action. */}
        <div aria-live="polite" className="sr-only">
          {tail.map(describe).join(" ")}
        </div>

        <AnimatePresence>
          {state.winner !== null ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            >
              <motion.div
                initial={{ scale: 0.92, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="board-frame w-full max-w-sm rounded-2xl p-8 text-center"
              >
                <div className="font-display text-3xl text-[var(--gold)]">
                  {state.winner === 0 ? "Light" : "Dark"} wins
                </div>
                <div className="mt-2 text-sm text-[var(--ink-dim)]">
                  {controllerOf(mode, state.winner) === "human" ? "A worthy victory." : "The machine prevails — this time."}
                  {" "}All seven pieces home in {state.rollCount} rolls.
                </div>
                <div className="mt-6 flex justify-center gap-3">
                  <button className="btn btn-primary rounded-lg px-5 py-2 text-sm" onClick={game.newGame}>
                    Play again
                  </button>
                  <button className="btn rounded-lg px-5 py-2 text-sm" onClick={onExit}>
                    Menu
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
