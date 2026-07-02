/**
 * @ur/cli — terminal runner proving the engine and AI end-to-end.
 *
 *   pnpm demo  [-- --seed 7 --p0 expert --p1 medium]   one narrated game
 *   pnpm sim   [-- --games 100 --p0 hard --p1 beginner --seed 1]
 *   pnpm bench                                          full difficulty ladder
 */
import { createRng, GameSession, type GameEvent } from "@ur/engine";
import { createAgent, DIFFICULTIES, runMatch, type DifficultyId } from "@ur/ai";
import { renderBoard } from "./board-render";

interface Args {
  readonly command: string;
  readonly flags: ReadonlyMap<string, string>;
}

function parseArgs(argv: readonly string[]): Args {
  const command = argv[0] ?? "demo";
  const flags = new Map<string, string>();
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--" || !arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq !== -1) {
      flags.set(arg.slice(2, eq), arg.slice(eq + 1));
      continue;
    }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags.set(arg.slice(2), next);
      i++;
    } else {
      flags.set(arg.slice(2), "true");
    }
  }
  return { command, flags };
}

function difficultyFlag(flags: ReadonlyMap<string, string>, name: string, fallback: DifficultyId): DifficultyId {
  const value = (flags.get(name) ?? fallback) as DifficultyId;
  if (!DIFFICULTIES.some((d) => d.id === value)) {
    console.error(`unknown difficulty "${value}" — use: ${DIFFICULTIES.map((d) => d.id).join(", ")}`);
    process.exit(1);
  }
  return value;
}

function intFlag(flags: ReadonlyMap<string, string>, name: string, fallback: number): number {
  const raw = flags.get(name);
  const value = raw === undefined ? fallback : Number.parseInt(raw, 10);
  if (!Number.isInteger(value)) {
    console.error(`--${name} must be an integer`);
    process.exit(1);
  }
  return value;
}

function describeEvent(event: GameEvent): string {
  const who = event.player === 0 ? "Light ○" : "Dark  ●";
  switch (event.type) {
    case "roll":
      return `${who} rolls ${event.total}  [${event.values.join(" ")}]`;
    case "pass":
      return `${who} cannot move (${event.reason === "rolled-zero" ? "rolled a zero" : "no legal moves"}) — turn passes`;
    case "move": {
      const fromText = event.from === 0 ? "enters" : `moves ${event.from}`;
      const toText = event.finished ? "→ home!" : `→ ${event.to}`;
      const extras = [
        event.capture ? "captures!" : "",
        event.rosette ? "rosette — rolls again" : "",
      ].filter(Boolean).join(", ");
      return `${who} ${fromText} ${toText}${extras ? `  (${extras})` : ""}`;
    }
  }
}

function demo(flags: ReadonlyMap<string, string>): void {
  const seed = intFlag(flags, "seed", 7);
  const p0 = difficultyFlag(flags, "p0", "expert");
  const p1 = difficultyFlag(flags, "p1", "medium");
  const agents = [createAgent(p0), createAgent(p1)] as const;
  const rng = createRng((seed ^ 0x9e3779b9) >>> 0);
  const session = new GameSession({ seed });
  const verbose = flags.get("verbose") === "true";

  console.log(`\nRoyal Game of Ur — demo (seed ${seed})`);
  console.log(`Light ○: ${p0}   Dark ●: ${p1}\n`);
  console.log(renderBoard(session.state) + "\n");

  let shown = 0;
  let guard = 0;
  while (session.state.winner === null) {
    if (++guard > 4000) throw new Error("demo game did not terminate");
    const before = session.state.history.length;
    if (session.phase === "awaiting-roll") {
      session.roll();
    } else {
      const agent = agents[session.state.current];
      session.move(agent.chooseMove(session.state, session.legalMoves(), { rng }));
    }
    for (const event of session.state.history.slice(before)) {
      console.log("  " + describeEvent(event));
      shown++;
    }
    const justMoved = session.state.history[session.state.history.length - 1]?.type === "move";
    if (justMoved && (verbose || shown < 24 || session.state.winner !== null)) {
      console.log("\n" + renderBoard(session.state) + "\n");
    } else if (justMoved && shown === 24) {
      console.log("\n  … (boards elided; pass --verbose to see every position) …\n");
    }
  }
  const winner = session.state.winner === 0 ? `Light ○ (${p0})` : `Dark ● (${p1})`;
  console.log(`\n${winner} wins in ${session.state.rollCount} rolls.\n`);
}

function sim(flags: ReadonlyMap<string, string>): void {
  const games = intFlag(flags, "games", 100);
  const seed = intFlag(flags, "seed", 1);
  const p0 = difficultyFlag(flags, "p0", "hard");
  const p1 = difficultyFlag(flags, "p1", "beginner");
  const start = Date.now();
  const result = runMatch(() => createAgent(p0), () => createAgent(p1), { games, seed });
  const seconds = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n${p0} vs ${p1} — ${games} games (seed ${seed}, alternating seats, ${seconds}s)`);
  console.log(`  ${p0.padEnd(9)} ${result.aWins} wins  (${(result.aWinRate * 100).toFixed(1)}%)`);
  console.log(`  ${p1.padEnd(9)} ${result.bWins} wins  (${((1 - result.aWinRate) * 100).toFixed(1)}%)`);
  console.log(`  average game length: ${result.averageRolls.toFixed(0)} rolls\n`);
}

function bench(flags: ReadonlyMap<string, string>): void {
  const seed = intFlag(flags, "seed", 12345);
  console.log("\nDifficulty ladder — each tier vs the one below (seat-alternating, seeded)\n");
  const pairs: [DifficultyId, DifficultyId, number][] = [
    ["easy", "beginner", 100],
    ["medium", "easy", 100],
    ["hard", "medium", 60],
    ["expert", "hard", 30],
  ];
  for (const [a, b, games] of pairs) {
    const start = Date.now();
    const result = runMatch(() => createAgent(a), () => createAgent(b), { games, seed });
    const seconds = ((Date.now() - start) / 1000).toFixed(1);
    console.log(
      `  ${a.padEnd(8)} vs ${b.padEnd(8)}  ${(result.aWinRate * 100).toFixed(1).padStart(5)}%  over ${String(games).padStart(3)} games  (${seconds}s)`,
    );
  }
  console.log("\nHigher tiers should stay above 50% everywhere.\n");
}

const { command, flags } = parseArgs(process.argv.slice(2));
switch (command) {
  case "demo":
    demo(flags);
    break;
  case "sim":
    sim(flags);
    break;
  case "bench":
    bench(flags);
    break;
  default:
    console.error(`unknown command "${command}" — use demo, sim, or bench`);
    process.exit(1);
}
