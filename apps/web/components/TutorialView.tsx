"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "framer-motion";
import { useGameLayout } from "@/lib/useGameLayout";
import { useTutorial } from "@/lib/useTutorial";
import { useSettings } from "@/lib/settings";
import { Board } from "./Board";
import { PlayerPanel } from "./PlayerPanel";

/**
 * Guided first game: real engine, scripted dice. Layout mirrors GameView
 * (same grid classes), with the dice tray replaced by the coach bar.
 */
export function TutorialView({ onExit }: { onExit(): void }) {
  const tutorial = useTutorial();
  const { layout } = useGameLayout();
  const { settings } = useSettings();
  const { state } = tutorial;

  const entryMove = tutorial.allowedMoves.find((m) => m.from === 0) ?? null;

  const finish = () => {
    tutorial.markDone();
    onExit();
  };

  return (
    <MotionConfig reducedMotion={settings.motion === "reduced" ? "always" : "user"}>
      <div
        className={[
          "game-screen mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 py-4 sm:gap-4 sm:py-6 lg:max-w-6xl",
        ].join(" ")}
      >
        <header className="game-header flex items-center justify-between">
          <button className="btn rounded-lg px-3 py-1.5 text-sm" onClick={finish}>
            ‹ Exit
          </button>
          <h1 className="font-display text-lg tracking-wide text-[var(--gold)] sm:text-xl">Learn to play</h1>
          <div className="flex items-center gap-2">
            <span className="chip">
              {tutorial.stepIndex + 1} / {tutorial.stepCount}
            </span>
            <button className="btn rounded-lg px-3 py-1.5 text-sm" onClick={tutorial.restart}>
              Restart
            </button>
            <button className="btn rounded-lg px-3 py-1.5 text-sm" onClick={finish}>
              Skip
            </button>
          </div>
        </header>

        <LayoutGroup>
          <div className="game-grid min-h-0 flex-1" data-layout={layout}>
            <div className="ga-dark">
              <PlayerPanel
                state={state}
                player={1}
                controller="human"
                active={tutorial.guideActing}
                entryMove={null}
                canAct={false}
                onMove={() => undefined}
              />
            </div>

            <div className="ga-board relative">
              <Board
                state={state}
                legal={tutorial.allowedMoves}
                canAct={tutorial.waitingForMove}
                onMove={tutorial.movePiece}
                orientation={layout}
                hintMove={tutorial.allowedMoves[0] ?? null}
              />
            </div>

            <div className="ga-light">
              <PlayerPanel
                state={state}
                player={0}
                controller="human"
                active={tutorial.waitingForMove || tutorial.canRoll}
                entryMove={tutorial.waitingForMove ? entryMove : null}
                canAct={tutorial.waitingForMove && entryMove !== null}
                onMove={tutorial.movePiece}
              />
            </div>

            <div className="ga-dice">
              <div className="dice-tray flex flex-col gap-2 rounded-xl bg-[var(--bg-raised)] px-4 py-3">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={tutorial.stepIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm leading-relaxed text-[var(--ink)]"
                    role="status"
                  >
                    {tutorial.coach}
                  </motion.p>
                </AnimatePresence>
                <div className="flex items-center justify-end gap-2">
                  {tutorial.canRoll ? (
                    <button className="btn btn-primary pulse-gold rounded-lg px-5 py-2 text-sm" onClick={tutorial.roll}>
                      Roll
                    </button>
                  ) : null}
                  {tutorial.waitingForMove ? (
                    <span className="text-xs text-[var(--gold)]">Tap the glowing piece</span>
                  ) : null}
                  {tutorial.guideActing ? (
                    <span className="text-xs text-[var(--ink-dim)]">Dark is playing…</span>
                  ) : null}
                  {tutorial.canNext ? (
                    <button
                      className="btn btn-primary rounded-lg px-5 py-2 text-sm"
                      onClick={tutorial.finished ? finish : tutorial.next}
                    >
                      {tutorial.finished ? "Finish" : "Next"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </LayoutGroup>
      </div>
    </MotionConfig>
  );
}
