"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-white/5 py-3 last:border-0">
      <h3 className="font-display mb-1 text-base text-[var(--gold)]">{title}</h3>
      <div className="text-sm leading-relaxed text-[var(--ink-dim)]">{children}</div>
    </section>
  );
}

const RULES = (
  <>
    <Section title="The objective">
      Race all seven of your pieces along your path and bear them off before your opponent.
      First to seven home wins — there are no draws.
    </Section>
    <Section title="The board">
      Twenty squares: your private entry lane (4 squares), the shared middle lane (8 squares
      both players fight over), and your private exit lane (2 squares). Flower squares are{" "}
      <em>rosettes</em>.
    </Section>
    <Section title="The dice">
      Four pyramid dice, each worth 0 or 1 — throws total 0–4. The odds favor the middle:
      0 and 4 are 1-in-16 each, 2 comes up nearly half the time. A throw of 0 forfeits the turn.
    </Section>
    <Section title="Moving">
      Move one piece exactly the thrown total. A new piece <em>enters</em> that many squares up
      your entry lane. You may never land on your own piece; if nothing can move, the turn
      passes.
    </Section>
    <Section title="Rosettes">
      Landing on any rosette grants another throw — chains are the engine of fast play. The{" "}
      <em>central</em> rosette on the shared lane is also safe ground: a piece there can never
      be captured (and blocks the square while it stays).
    </Section>
    <Section title="Captures">
      Land on an enemy piece on the shared lane and it is captured — sent back to its owner's
      pool to start over. Your private lanes can never be raided.
    </Section>
    <Section title="Bearing off">
      Leaving the board needs the <em>exact</em> throw: a piece two squares from the end exits
      only on a 2. Overshooting is not a move.
    </Section>
  </>
);

const STRATEGY = (
  <>
    <Section title="Opening">
      Develop early — pieces in the pool score nothing. A first throw of 4 is gold: it enters
      straight onto your rosette for a free second throw.
    </Section>
    <Section title="The shared lane">
      It is a battlefield, not a road. Count the dice: an enemy 1–4 behind you is a threat
      weighted by probability (2 is the likeliest throw — sitting exactly 2 ahead of an enemy
      piece is the worst seat). Advance in ones and twos behind cover when the lane is hot.
    </Section>
    <Section title="The central rosette">
      The strongest square in the game: safe, forward, and worth a free throw on arrival. Parking
      a piece there both shelters it and denies the square to the enemy.
    </Section>
    <Section title="Capturing well">
      A capture is worth the enemy's whole journey so far — but the capturing piece then stands
      on the lane, exposed. Capture when you can survive the reply, or when the tempo swing wins
      the race outright.
    </Section>
    <Section title="The endgame">
      Exact bear-offs turn the finish into arithmetic. Spread your last pieces across different
      distances so more throw totals are useful, and remember a rosette on the exit lane buys
      the extra throw that often decides the race.
    </Section>
  </>
);

export function HowToPlay({
  open,
  onClose,
  onStartTutorial,
}: {
  open: boolean;
  onClose(): void;
  onStartTutorial(): void;
}) {
  const [tab, setTab] = useState<"rules" | "strategy">("rules");

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="How to play"
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="board-frame flex max-h-[85dvh] w-full max-w-md flex-col rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--frame-edge)] px-5 py-3.5">
              <span className="font-display text-xl text-[var(--gold)]">How to play</span>
              <div className="flex gap-1" role="tablist" aria-label="Guide sections">
                <button
                  role="tab"
                  aria-selected={tab === "rules"}
                  className={["btn rounded-lg px-3 py-1 text-xs", tab === "rules" ? "ring-1 ring-[var(--gold)]" : ""].join(" ")}
                  onClick={() => setTab("rules")}
                >
                  Rules
                </button>
                <button
                  role="tab"
                  aria-selected={tab === "strategy"}
                  className={["btn rounded-lg px-3 py-1 text-xs", tab === "strategy" ? "ring-1 ring-[var(--gold)]" : ""].join(" ")}
                  onClick={() => setTab("strategy")}
                >
                  Strategy
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-2">{tab === "rules" ? RULES : STRATEGY}</div>
            <div className="flex justify-between gap-3 border-t border-[var(--frame-edge)] px-5 py-3.5">
              <button className="btn rounded-lg px-4 py-2 text-sm" onClick={onClose}>
                Close
              </button>
              <button
                className="btn btn-primary rounded-lg px-4 py-2 text-sm"
                onClick={() => {
                  onClose();
                  onStartTutorial();
                }}
              >
                Start interactive tutorial
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
