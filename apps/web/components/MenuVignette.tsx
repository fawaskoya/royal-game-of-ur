"use client";

/**
 * The homepage's living exhibit: a real engine session playing itself in
 * slow motion on a display-tilted board. Not a video, not a mock — every
 * move is `legalMoves` + `applyMove`, so the attract loop can never show an
 * illegal position.
 *
 * Reduced motion: the game is advanced once, silently, to a natural
 * mid-game tableau and left still.
 */
import { useEffect, useRef, useState } from "react";
import { GameSession, type GameState } from "@ur/engine";
import { Board } from "./Board";

const STEP_MS = 1500;
const STILL_STEPS = 26;

function step(session: GameSession): void {
  if (session.state.winner !== null) return;
  if (session.phase === "awaiting-roll") {
    session.roll();
    return;
  }
  const moves = session.legalMoves();
  if (moves.length > 0) session.move(moves[Math.floor(Math.random() * moves.length)]!);
}

export function MenuVignette() {
  const sessionRef = useRef<GameSession | null>(null);
  if (sessionRef.current === null) sessionRef.current = new GameSession({});
  const [state, setState] = useState<GameState>(() => sessionRef.current!.state);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      for (let i = 0; i < STILL_STEPS; i++) step(sessionRef.current!);
      setState(sessionRef.current!.state);
      return;
    }
    const timer = setInterval(() => {
      if (document.hidden) return;
      const session = sessionRef.current!;
      if (session.state.winner !== null) {
        sessionRef.current = new GameSession({});
      } else {
        step(session);
      }
      setState(sessionRef.current!.state);
    }, STEP_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <figure aria-hidden className="vignette-tilt select-none">
      <div className="vignette-board pointer-events-none">
        <Board state={state} legal={[]} canAct={false} onMove={() => undefined} orientation="horizontal" />
      </div>
      <figcaption className="mt-5 text-center text-xs tracking-wide text-[var(--ink-dim)]">
        The machine is playing itself while it waits for you.
      </figcaption>
    </figure>
  );
}
