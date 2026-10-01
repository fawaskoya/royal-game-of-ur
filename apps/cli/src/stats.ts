/**
 * Reproducible statistics for the strategy guide (apps/web/app/strategy).
 *
 *   pnpm stats [-- --games 4000 --seed 2026]
 *
 * Everything is simulated through @ur/engine with seeded dice, so the numbers
 * on the site can be regenerated exactly. Exact dice odds are computed, not
 * simulated.
 */
import { createRng, GameSession, rollDistribution, type GameEvent, type PlayerId } from "@ur/engine";
import { createAgent, runMatch, type DifficultyId } from "@ur/ai";

const args = process.argv.slice(2);
const flag = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`);
  const v = i >= 0 ? Number(args[i + 1]) : NaN;
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
};
const GAMES = flag("games", 4000);
const SEED = flag("seed", 2026);

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
/** 95% normal-approximation margin for a proportion. */
const margin = (p: number, n: number) => 1.96 * Math.sqrt((p * (1 - p)) / n);

interface Profile {
  games: number;
  seat0Wins: number;
  throws: number[];
  captures: number[];
  rosettes: number[];
  winnerHadMoreCaptures: number;
  decidedByCaptures: number;
  comebackFrom3: number; // games where the winner was once 3+ pieces behind in pieces home
  trailedBy3: number;
}

function profile(tier: DifficultyId, games: number, seed: number): Profile {
  const out: Profile = {
    games,
    seat0Wins: 0,
    throws: [],
    captures: [],
    rosettes: [],
    winnerHadMoreCaptures: 0,
    decidedByCaptures: 0,
    comebackFrom3: 0,
    trailedBy3: 0,
  };
  for (let g = 0; g < games; g++) {
    const gameSeed = seed + g * 7919;
    const session = new GameSession({ seed: gameSeed });
    const rng = createRng((gameSeed ^ 0x9e3779b9) >>> 0);
    const agents = [createAgent(tier), createAgent(tier)] as const;
    const home: [number, number] = [0, 0];
    let deficit: [number, number] = [0, 0]; // worst (opponent home − own home) seen per player
    while (session.state.winner === null) {
      if (session.phase === "awaiting-roll") {
        session.roll();
        continue;
      }
      const p = session.state.current;
      session.move(agents[p].chooseMove(session.state, session.legalMoves(), { rng }));
      const last = session.state.history[session.state.history.length - 1] as GameEvent;
      if (last.type === "move" && last.finished) {
        home[last.player]++;
        deficit = [Math.max(deficit[0], home[1] - home[0]), Math.max(deficit[1], home[0] - home[1])];
      }
    }
    const s = session.state;
    const winner = s.winner as PlayerId;
    const loser = (1 - winner) as PlayerId;
    const caps: [number, number] = [0, 0];
    let ros = 0;
    for (const e of s.history) {
      if (e.type !== "move") continue;
      if (e.capture) caps[e.player]++;
      if (e.rosette && !e.finished) ros++;
    }
    if (winner === 0) out.seat0Wins++;
    out.throws.push(s.rollCount);
    out.captures.push(caps[0] + caps[1]);
    out.rosettes.push(ros);
    if (caps[0] !== caps[1]) {
      out.decidedByCaptures++;
      if (caps[winner] > caps[loser]) out.winnerHadMoreCaptures++;
    }
    if (deficit[winner] >= 3) out.comebackFrom3++;
    if (deficit[0] >= 3 || deficit[1] >= 3) out.trailedBy3++;
  }
  return out;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};

const t0 = Date.now();
const dist = rollDistribution(4);
console.log("\n# Exact dice odds (four binary dice)");
dist.forEach((p, k) => console.log(`  throw ${k}: ${pct(p)}  (${Math.round(p * 16)} in 16)`));

for (const tier of ["medium", "hard"] as const) {
  const n = tier === "medium" ? GAMES : Math.max(200, Math.floor(GAMES / 4));
  const p = profile(tier, n, SEED);
  const seat0 = p.seat0Wins / p.games;
  console.log(`\n# ${tier} vs ${tier} — ${p.games} games`);
  console.log(`  first player (Light) wins: ${pct(seat0)} ± ${pct(margin(seat0, p.games))}`);
  console.log(`  throws per game: mean ${mean(p.throws).toFixed(1)}, median ${median(p.throws)}`);
  console.log(`  captures per game: mean ${mean(p.captures).toFixed(2)}`);
  console.log(`  rosette landings per game (both players): mean ${mean(p.rosettes).toFixed(2)}`);
  console.log(
    `  player with more captures won: ${pct(p.winnerHadMoreCaptures / p.decidedByCaptures)} of ${p.decidedByCaptures} games with unequal captures`,
  );
  console.log(
    `  comebacks: in ${p.trailedBy3} games someone fell 3+ pieces behind; the trailing player still won ${pct(p.comebackFrom3 / Math.max(1, p.trailedBy3))}`,
  );
}

console.log("\n# Skill vs luck: each tier against random moves (Beginner), seats alternating");
for (const [tier, n] of [["easy", 400], ["medium", 400], ["hard", 200], ["expert", 60]] as const) {
  const r = runMatch(() => createAgent(tier), () => createAgent("beginner"), { games: n, seed: SEED });
  console.log(`  ${tier.padEnd(7)} beats Beginner ${pct(r.aWinRate)} ± ${pct(margin(r.aWinRate, n))} (${n} games)`);
}
console.log(`\n(${((Date.now() - t0) / 1000).toFixed(0)}s, seed ${SEED})`);
