"use client";

/**
 * The homepage's living exhibit: a real engine session playing itself in slow
 * motion on a display-tilted board. Not a video, not a mock — every move is
 * `legalMoves` + `applyMove`, so the attract loop can never show an illegal
 * position.
 *
 * It must look ALIVE the instant the page paints — no empty board sitting for
 * a beat before the first move. So the initial state is pre-advanced by a
 * fixed opening: seeded session + seeded move picks make it deterministic, so
 * server and client render the identical mid-game tableau (no hydration
 * mismatch), and the very first frame already shows a game in progress. Live
 * play then continues from there; finished games restart from a fresh random
 * one.
 *
 * Reduced motion: the pre-advanced opening is enough — it holds that tableau
 * still.
 */
import { useEffect, useRef, useState } from "react";
import { GameSession, createRng, type GameState } from "@ur/engine";
import { Board } from "./Board";

const STEP_MS = 1500;
const OPENING_STEPS = 22; // rolls + moves — enough pieces on the board to read as a live game

/** One attract step: roll if awaiting, else play a picked legal move. `pick`
 *  returns [0,1) — seeded for the deterministic opening, Math.random live. */
function step(session: GameSession, pick: () => number): void {
  if (session.state.winner !== null) return;
  if (session.phase === "awaiting-roll") {
    session.roll();
    return;
  }
  const moves = session.legalMoves();
  if (moves.length > 0) session.move(moves[Math.floor(pick() * moves.length)]!);
}

function openingSession(): GameSession {
  const session = new GameSession({ seed: 0x5eed });
  const rng = createRng(1337);
  for (let i = 0; i < OPENING_STEPS; i++) step(session, () => rng.next());
  return session;
}

export function MenuVignette() {
  const sessionRef = useRef<GameSession | null>(null);
  if (sessionRef.current === null) sessionRef.current = openingSession();
  const [state, setState] = useState<GameState>(() => sessionRef.current!.state);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      const session = sessionRef.current!;
      if (session.state.winner !== null) {
        sessionRef.current = new GameSession({}); // fresh random game continues the loop
      } else {
        step(session, Math.random);
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
