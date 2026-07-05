"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "framer-motion";
import { useLocalRoom } from "@/lib/multiplayer/useLocalRoom";
import { useGameLayout } from "@/lib/useGameLayout";
import { useSettings } from "@/lib/settings";
import { describeEvent } from "@/lib/describeEvent";
import { Board } from "./Board";
import { PlayerPanel } from "./PlayerPanel";
import { DiceTray } from "./DiceTray";

/**
 * Private room (beta): the full online flow — create/join by code, server-
 * validated moves, verified event sync — running over a local wire that
 * reaches every window of this browser. The internet wire arrives with
 * accounts (docs/MULTIPLAYER_ARCHITECTURE.md); this screen won't change.
 */
export function OnlineRoomView({ onExit }: { onExit(): void }) {
  const room = useLocalRoom();
  const { layout } = useGameLayout();
  const { settings } = useSettings();
  const [joinCode, setJoinCode] = useState("");

  const entryMove = useMemo(
    () => room.legal.find((m) => m.from === 0) ?? null,
    [room.legal],
  );

  const leaveAndExit = () => {
    room.leave();
    onExit();
  };

  if (room.phase === "playing" && room.state) {
    const state = room.state;
    return (
      <MotionConfig reducedMotion={settings.motion === "reduced" ? "always" : "user"}>
        <div
          className={[
            "game-screen mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 py-4 sm:gap-4 sm:py-6",
            layout === "horizontal" ? "lg:max-w-6xl" : "",
          ].join(" ")}
        >
          <header className="game-header flex items-center justify-between">
            <button className="btn rounded-lg px-3 py-1.5 text-sm" onClick={leaveAndExit}>
              ‹ Leave
            </button>
            <h1 className="font-display text-lg tracking-wide text-[var(--gold)] sm:text-xl">
              Room {room.code}
            </h1>
            <span className="chip">
              You are {room.mySeat === 0 ? "☀ Light" : "☾ Dark"}
            </span>
          </header>

          <LayoutGroup>
            <div className="game-grid min-h-0 flex-1" data-layout={layout}>
              <div className="ga-dark">
                <PlayerPanel
                  state={state}
                  player={1}
                  controller="human"
                  active={state.winner === null && state.current === 1}
                  entryMove={room.mySeat === 1 && state.current === 1 ? entryMove : null}
                  canAct={room.canMove && state.current === 1}
                  onMove={room.movePiece}
                />
              </div>
              <div className="ga-board relative">
                <Board
                  state={state}
                  legal={room.legal}
                  canAct={room.canMove}
                  onMove={room.movePiece}
                  orientation={layout}
                />
                {!room.myTurn && state.winner === null ? (
                  <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
                    <div className="rounded-full border border-[var(--frame-edge)] bg-[var(--bg-raised)]/95 px-4 py-1.5 text-xs text-[var(--ink-dim)]">
                      Waiting for {state.current === 0 ? "Light" : "Dark"}…
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="ga-light">
                <PlayerPanel
                  state={state}
                  player={0}
                  controller="human"
                  active={state.winner === null && state.current === 0}
                  entryMove={room.mySeat === 0 && state.current === 0 ? entryMove : null}
                  canAct={room.canMove && state.current === 0}
                  onMove={room.movePiece}
                />
              </div>
              <div className="ga-dice">
                <DiceTray
                  state={state}
                  tail={room.tail}
                  aiTurn={false}
                  humanCanRoll={room.canRoll}
                  humanCanMove={room.canMove}
                  diceSpeed={settings.diceSpeed}
                  onRoll={room.roll}
                />
              </div>
            </div>
          </LayoutGroup>

          <div aria-live="polite" className="sr-only">
            {room.tail.map(describeEvent).join(" ")}
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
                  className="board-frame w-full max-w-sm rounded-2xl p-8 text-center"
                >
                  <div className="font-display text-3xl text-[var(--gold)]">
                    {state.winner === 0 ? "Light" : "Dark"} wins
                  </div>
                  <div className="mt-2 text-sm text-[var(--ink-dim)]">
                    {state.winner === room.mySeat ? "Victory is yours." : "A rematch is only a room away."}
                  </div>
                  <div className="mt-6 flex justify-center gap-3">
                    <button className="btn btn-primary rounded-lg px-5 py-2 text-sm" onClick={leaveAndExit}>
                      Back to menu
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

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="text-center">
        <h1 className="font-display text-3xl text-[var(--gold)]">Private room</h1>
        <p className="mt-2 text-sm text-[var(--ink-dim)]">
          <span className="chip">beta</span> Today a room reaches the other windows of this
          browser — perfect for two screens side by side. Internet rooms arrive with accounts.
        </p>
      </header>

      {room.phase === "idle" ? (
        <div className="flex flex-col gap-3">
          <button className="btn w-full rounded-xl px-4 py-3 text-left" onClick={room.host}>
            <div className="font-display">Create a room</div>
            <div className="mt-0.5 text-xs text-[var(--ink-dim)]">
              You play Light and share a 4-letter code.
            </div>
          </button>
          <div className="flex flex-col gap-3 rounded-xl bg-[var(--bg-raised)] p-4">
            <label className="text-sm text-[var(--ink-dim)]" htmlFor="room-code">
              Join with a code
            </label>
            <div className="flex gap-2">
              <input
                id="room-code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
                placeholder="ABCD"
                className="btn w-28 rounded-lg px-3 py-2 text-center font-mono text-lg tracking-[0.3em]"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="btn btn-primary flex-1 rounded-lg px-4 py-2 text-sm"
                disabled={joinCode.trim().length !== 4}
                onClick={() => room.join(joinCode)}
              >
                Join room
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {room.phase === "waiting" ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-[var(--bg-raised)] p-6 text-center">
          {room.code && room.mySeat === 0 ? (
            <>
              <div className="text-sm text-[var(--ink-dim)]">Share this code — or open a new window and join with it:</div>
              <div className="font-display text-5xl tracking-[0.35em] text-[var(--gold)]">{room.code}</div>
              <div className="text-xs text-[var(--ink-dim)]">Waiting for a second player…</div>
            </>
          ) : (
            <>
              <div className="text-sm text-[var(--ink-dim)]">Joining room</div>
              <div className="font-display text-4xl tracking-[0.35em] text-[var(--gold)]">{room.code}</div>
              <div className="text-xs text-[var(--ink-dim)]">
                No response? Check the code and that the host window is still open.
              </div>
            </>
          )}
        </div>
      ) : null}

      {room.phase === "error" ? (
        <div className="rounded-xl bg-[var(--bg-raised)] p-4 text-center text-sm text-[var(--danger)]">
          {room.error ?? "Something went wrong."}
        </div>
      ) : null}

      <div className="flex justify-center">
        <button className="btn rounded-lg px-4 py-2 text-sm" onClick={leaveAndExit}>
          ‹ Back to menu
        </button>
      </div>
    </main>
  );
}
