"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "framer-motion";
import { useGameLayout } from "@/lib/useGameLayout";
import { useTutorial } from "@/lib/useTutorial";
import { useSettings } from "@/lib/settings";
import { sfx } from "@/lib/sound";
import { trackTutorialComplete } from "@/lib/analytics";
import { Board } from "./Board";
import { PlayerPanel } from "./PlayerPanel";
import { DiceTray } from "./DiceTray";

/**
 * Guided first game: real engine, scripted dice.
 * Same mobile flank layout as GameView; coach copy lives above the dice tray.
 */
export function TutorialView({ onExit }: { onExit(): void }) {
  const tutorial = useTutorial();
  const { layout, isTouch } = useGameLayout();
  const { settings } = useSettings();
  const { state } = tutorial;
  const heardLen = useRef(0);

  const entryMove = tutorial.allowedMoves.find((m) => m.from === 0) ?? null;
  const useRail = layout === "vertical" && isTouch;

  // Sound: same rules as GameView (tutorial never used the live tail before).
  useEffect(() => {
    const history = state.history;
    if (history.length <= heardLen.current) {
      heardLen.current = history.length;
      return;
    }
    const fresh = history.slice(heardLen.current);
    heardLen.current = history.length;
    for (const event of fresh) {
      if (event.type === "roll") {
        sfx.roll();
        continue;
      }
      if (event.type === "move") {
        if (event.capture) sfx.capture();
        else if (event.extraTurn) sfx.rosette();
        else sfx.move();
      }
    }
  }, [state.history]);

  useEffect(() => {
    if (tutorial.finished && state.winner !== null) sfx.win();
  }, [tutorial.finished, state.winner]);

  // `finish` backs Exit, Skip and the final Finish button alike, so
  // completion is decided by whether the learner actually reached the last
  // step — not by which button they pressed to leave.
  const completedRef = useRef(false);
  const finish = () => {
    if (tutorial.finished && !completedRef.current) {
      completedRef.current = true;
      trackTutorialComplete();
    }
    tutorial.markDone();
    onExit();
  };

  const onRoll = () => {
    // Play + unlock AudioContext on the user gesture (async resume after paint is unreliable).
    sfx.roll();
    heardLen.current = state.history.length + 1; // avoid double-playing the same roll in the effect
    tutorial.roll();
  };

  const statusHint = tutorial.waitingForMove
    ? "Tap the glowing piece"
    : tutorial.guideActing
      ? "Dark is playing…"
      : null;

  return (
    <MotionConfig reducedMotion={settings.motion === "reduced" ? "always" : "user"}>
      <div className="game-screen mx-auto w-full max-w-3xl gap-2 px-2 py-2 sm:gap-3 sm:px-3 sm:py-4 lg:max-w-6xl lg:gap-4 lg:py-6">
        <header className="game-header flex shrink-0 items-center justify-between">
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
                variant={useRail ? "rail" : "default"}
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
                routeFor={0}
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
                variant={useRail ? "rail" : "default"}
              />
            </div>

            <div className="ga-dice flex min-w-0 flex-col gap-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tutorial.stepIndex}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="max-h-[4.5rem] shrink-0 overflow-y-auto rounded-xl border border-[var(--gold-faint)] bg-[var(--bg-raised)] px-2.5 py-1.5 sm:max-h-none sm:px-3 sm:py-2"
                  role="status"
                >
                  <p className="text-[11px] leading-snug text-[var(--ink)] sm:text-sm sm:leading-relaxed">
                    {tutorial.coach}
                  </p>
                </motion.div>
              </AnimatePresence>

              <DiceTray
                state={state}
                tail={state.history.slice(-3)}
                aiTurn={tutorial.guideActing}
                humanCanRoll={tutorial.canRoll}
                humanCanMove={tutorial.waitingForMove}
                hintText={statusHint}
                diceSpeed={settings.diceSpeed}
                onRoll={onRoll}
                compact={isTouch || layout === "horizontal"}
                extraActions={
                  tutorial.canNext ? (
                    <button
                      className="btn btn-primary rounded-lg px-4 py-1.5 text-sm"
                      onClick={tutorial.finished ? finish : tutorial.next}
                    >
                      {tutorial.finished ? "Finish" : "Next"}
                    </button>
                  ) : null
                }
              />
            </div>
          </div>
        </LayoutGroup>
      </div>
    </MotionConfig>
  );
}
