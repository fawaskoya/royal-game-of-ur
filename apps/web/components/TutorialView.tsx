"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "framer-motion";
import { useGameLayout } from "@/lib/useGameLayout";
import { useTutorial } from "@/lib/useTutorial";
import { useSettings } from "@/lib/settings";
import { Board } from "./Board";
import { PlayerPanel } from "./PlayerPanel";
import { Die, DieGradients } from "./DiceTray";

/**
 * Guided first game: real engine, scripted dice.
 * Dice stay visible in their tray slot; coach copy sits *below* them so it
 * never covers the throw.
 */
export function TutorialView({ onExit }: { onExit(): void }) {
  const tutorial = useTutorial();
  const { layout } = useGameLayout();
  const { settings } = useSettings();
  const { state } = tutorial;

  const entryMove = tutorial.allowedMoves.find((m) => m.from === 0) ?? null;

  // Pending roll, or last roll for context (same idea as DiceTray).
  const lastRollEvent = [...state.history].reverse().find((e) => e.type === "roll");
  const values = state.dice?.values ?? lastRollEvent?.values ?? null;
  const total = state.dice?.total ?? lastRollEvent?.total ?? null;
  const stale = state.dice === null;

  const finish = () => {
    tutorial.markDone();
    onExit();
  };

  return (
    <MotionConfig reducedMotion={settings.motion === "reduced" ? "always" : "user"}>
      <div className="game-screen mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 py-4 sm:gap-4 sm:py-6 lg:max-w-6xl">
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
                entryMove={entryMove}
                canAct={tutorial.waitingForMove}
                onMove={tutorial.movePiece}
              />
            </div>

            <div className="ga-dice">
              <div className="dice-tray flex flex-col gap-2.5 rounded-xl bg-[var(--bg-raised)] px-4 py-3">
                {/* Dice row first — never covered by coach copy */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="dice-row flex items-center gap-2.5 px-1 sm:gap-3">
                      <DieGradients />
                      {(values ?? [0, 0, 0, 0]).map((value, i) => (
                        <Die
                          key={`${state.rollCount}-${i}`}
                          value={value as 0 | 1}
                          dim={stale || values === null}
                          index={i}
                          speed={settings.diceSpeed}
                        />
                      ))}
                    </div>
                    <div
                      className={[
                        "roll-total font-display w-8 text-center text-2xl",
                        stale ? "text-[var(--ink-dim)]" : "text-[var(--gold)]",
                      ].join(" ")}
                      aria-label={total === null ? "no roll yet" : `rolled ${total}`}
                    >
                      {total ?? "–"}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {tutorial.canRoll ? (
                      <button
                        className="btn btn-primary pulse-gold rounded-lg px-5 py-2 text-sm"
                        onClick={tutorial.roll}
                      >
                        Roll
                      </button>
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

                <AnimatePresence mode="wait">
                  <motion.p
                    key={tutorial.stepIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm leading-relaxed text-[var(--ink)]"
                    role="status"
                  >
                    {tutorial.coach}
                  </motion.p>
                </AnimatePresence>

                {tutorial.waitingForMove ? (
                  <p className="text-xs text-[var(--gold)]">Tap the glowing piece</p>
                ) : null}
                {tutorial.guideActing ? (
                  <p className="text-xs text-[var(--ink-dim)]">Dark is playing…</p>
                ) : null}
              </div>
            </div>
          </div>
        </LayoutGroup>
      </div>
    </MotionConfig>
  );
}
