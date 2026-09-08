"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "framer-motion";
import { useGameLayout } from "@/lib/useGameLayout";
import { useSettings } from "@/lib/settings";
import { describeEvent } from "@/lib/describeEvent";
import type { UseLocalRoomResult } from "@/lib/multiplayer/useLocalRoom";
import type { GameEndedSignal } from "@/lib/multiplayer/supabaseTransport";
import { Board } from "./Board";
import { PlayerPanel } from "./PlayerPanel";
import { DiceTray } from "./DiceTray";
import { OwnFlair } from "./Flair";

/** Live 1s countdown to a deadline; null when there's no clock. Resets
 * immediately whenever the deadline changes (a new turn) so it never lags. */
function useRemainingSeconds(deadlineMs: number | null | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadlineMs == null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadlineMs]);
  if (deadlineMs == null) return null;
  return Math.max(0, Math.ceil((deadlineMs - now) / 1000));
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * The in-room game screen, shared by the internet and same-device flows —
 * both hooks expose the same result shape, so this component doesn't know
 * (or care) which wire it's rendering. The online-trust props (ended,
 * onResign, onClaimTimeout, turnDeadlineMs) are optional: same-device
 * pass-and-play has no abandonment problem, so it simply omits them.
 */
export function RoomGameScreen({
  room,
  title,
  subtitle,
  notice,
  winNote,
  rematchLabel,
  onRematch,
  onLeave,
  ended = null,
  onResign,
  onClaimTimeout,
  turnDeadlineMs = null,
  rolling = false,
  busy = false,
}: {
  room: UseLocalRoomResult;
  title: string;
  /** Small line under the title — e.g. "Bright Kite 58 vs Patient River 68". */
  subtitle?: string | null;
  /** Inline transport error (e.g. "not your turn"), shown under the tray. */
  notice?: string | null;
  /** Extra line on the win overlay — e.g. the fresh online rating. */
  winNote?: string | null;
  rematchLabel?: string;
  onRematch?: () => void;
  onLeave(): void;
  /** Authoritative end signal (covers resign/timeout, which never touch the
   *  engine state.winner). Online only. */
  ended?: GameEndedSignal | null;
  onResign?: () => void;
  onClaimTimeout?: () => void;
  turnDeadlineMs?: number | null;
  /** Online: a throw is in flight, so the dice stay in the air. */
  rolling?: boolean;
  /** Online: an action is awaiting the server; don't invite another. */
  busy?: boolean;
}) {
  const { layout, isTouch } = useGameLayout();
  const { settings } = useSettings();
  const state = room.state!;

  const entryMove = useMemo(() => room.legal.find((m) => m.from === 0) ?? null, [room.legal]);
  const useRail = layout === "vertical" && isTouch;

  // One source of truth for "the game is over": a board finish OR a
  // resign/timeout reported on the games row.
  const finalWinner: 0 | 1 | null = ended ? ended.winner : state.winner;
  const isOver = finalWinner !== null;

  const remaining = useRemainingSeconds(isOver ? null : turnDeadlineMs);
  const showClock = onResign != null && !isOver && remaining != null; // online, live
  const opponentExpired = showClock && !room.myTurn && remaining === 0;
  const myTimeLow = showClock && room.myTurn && remaining! <= 30;

  // Two-step resign (no modal): first click arms, second within 4s confirms.
  const [resignArmed, setResignArmed] = useState(false);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleResign = () => {
    if (!onResign) return;
    if (resignArmed) {
      if (armTimer.current) clearTimeout(armTimer.current);
      setResignArmed(false);
      onResign();
      return;
    }
    setResignArmed(true);
    armTimer.current = setTimeout(() => setResignArmed(false), 4000);
  };
  useEffect(
    () => () => {
      if (armTimer.current) clearTimeout(armTimer.current);
    },
    [],
  );

  const canResign = onResign != null && !isOver;

  return (
    <MotionConfig reducedMotion={settings.motion === "reduced" ? "always" : "user"}>
      <div className="game-screen mx-auto w-full max-w-3xl gap-2 px-2 py-2 sm:gap-3 sm:px-3 sm:py-4 lg:max-w-6xl lg:gap-4 lg:py-6">
        <header className="game-header flex shrink-0 items-center justify-between">
          {canResign ? (
            <button
              className={[
                "btn rounded-lg px-3 py-1.5 text-sm",
                resignArmed ? "ring-1 ring-[var(--danger)] text-[var(--danger)]" : "",
              ].join(" ")}
              onClick={handleResign}
              title="Concede the game to your opponent"
            >
              {resignArmed ? "Confirm resign?" : "Resign"}
            </button>
          ) : (
            <button className="btn rounded-lg px-3 py-1.5 text-sm" onClick={onLeave}>
              ‹ Leave
            </button>
          )}
          <div className="text-center">
            <h1 className="font-display text-lg tracking-wide text-[var(--gold)] sm:text-xl">{title}</h1>
            {subtitle ? (
              <div className="text-[11px] text-[var(--ink-dim)]">
                {subtitle} <OwnFlair />
              </div>
            ) : null}
          </div>
          <span className="chip">You are {room.mySeat === 0 ? "☀ Light" : "☾ Dark"}</span>
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
                variant={useRail ? "rail" : "default"}
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
              {!isOver ? (
                <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
                  {opponentExpired && onClaimTimeout ? (
                    <button
                      className="btn btn-primary pointer-events-auto rounded-full px-4 py-1.5 text-xs font-medium"
                      onClick={onClaimTimeout}
                    >
                      Opponent out of time — claim the win
                    </button>
                  ) : !room.myTurn ? (
                    <div className="rounded-full border border-[var(--frame-edge)] bg-[var(--bg-raised)]/95 px-4 py-1.5 text-xs text-[var(--ink-dim)]">
                      Waiting for {state.current === 0 ? "Light" : "Dark"}
                      {showClock ? ` · ${clock(remaining!)}` : "…"}
                    </div>
                  ) : myTimeLow ? (
                    <div className="rounded-full border border-[var(--danger-soft)] bg-[var(--bg-raised)]/95 px-4 py-1.5 text-xs text-[var(--danger)]">
                      Your move · {clock(remaining!)} left
                    </div>
                  ) : null}
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
                variant={useRail ? "rail" : "default"}
              />
            </div>
            <div className="ga-dice">
              <DiceTray
                state={state}
                tail={room.tail}
                rolling={rolling}
                aiTurn={false}
                humanCanRoll={room.canRoll && !busy}
                humanCanMove={room.canMove}
                diceSpeed={settings.diceSpeed}
                hintText={notice ?? null}
                onRoll={room.roll}
                compact={isTouch || layout === "horizontal"}
              />
            </div>
          </div>
        </LayoutGroup>

        <div aria-live="polite" className="sr-only">
          {room.tail.map(describeEvent).join(" ")}
        </div>

        <AnimatePresence>
          {isOver ? (
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
                <div className="font-display gold-text text-3xl">
                  {finalWinner === 0 ? "Light" : "Dark"} wins
                </div>
                <div className="ornament-rule mx-auto mt-3 max-w-[220px] text-[10px]">✦</div>
                <div className="mt-3 text-sm text-[var(--ink-dim)]">{outcomeLine(ended, finalWinner, room.mySeat)}</div>
                {winNote ? <div className="mt-2 text-sm text-[var(--gold)]">{winNote}</div> : null}
                <div className="mt-6 flex justify-center gap-3">
                  {onRematch ? (
                    <button className="btn btn-primary rounded-lg px-5 py-2 text-sm" onClick={onRematch}>
                      {rematchLabel ?? "Rematch"}
                    </button>
                  ) : null}
                  <button className="btn rounded-lg px-5 py-2 text-sm" onClick={onLeave}>
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

function outcomeLine(ended: GameEndedSignal | null, winner: 0 | 1 | null, mySeat: 0 | 1 | null): string {
  const iWon = winner !== null && winner === mySeat;
  switch (ended?.endReason) {
    case "resign":
      return iWon ? "Your opponent resigned." : "You resigned.";
    case "timeout":
      return iWon ? "Their turn clock ran out — the win is yours." : "Your turn clock ran out.";
    default:
      return iWon ? "Victory is yours." : "A rematch is only a click away.";
  }
}
