import Link from "next/link";
import { SiteShell, H2, UL } from "@/components/site/SiteShell";
import { pageMeta } from "@/lib/site/meta";
import { JsonLd, article, breadcrumb } from "@/lib/site/jsonld";

const PATH = "/strategy";
const TITLE = "Royal Game of Ur Strategy: Tips Backed by the Odds";
const DESCRIPTION =
  "Exact dice odds, capture risk by distance, and what 5,000 simulated games reveal about the first move, captures and comebacks in the Royal Game of Ur.";

export const metadata = pageMeta(PATH, TITLE, DESCRIPTION, { ownImage: true });

const link = "text-[var(--gold)] underline underline-offset-2";
const table = "w-full border-collapse text-sm";
const th = "border-b border-[var(--gold-faint)] px-2 py-1.5 text-left font-normal text-[var(--ink-dim)]";
const td = "border-b border-white/5 px-2 py-1.5";

/*
 * Every number here is either exact (dice arithmetic) or measured by
 * `pnpm stats -- --games 4000 --seed 2026` (apps/cli/src/stats.ts), which plays
 * seeded games through the same rules engine the site runs on. Re-run it after
 * any engine or AI change and update these figures.
 */
const DICE = [
  { n: 0, sixteenths: 1 },
  { n: 1, sixteenths: 4 },
  { n: 2, sixteenths: 6 },
  { n: 3, sixteenths: 4 },
  { n: 4, sixteenths: 1 },
];
// Exact sixteenths: 6.25%, 25%, 37.5% — never rounded.
const pct = (sixteenths: number) => `${(sixteenths / 16) * 100}%`;

export default function StrategyPage() {
  return (
    <SiteShell
      title="Royal Game of Ur Strategy"
      intro="The Royal Game of Ur is a dice game where your choices matter a great deal. Here is what the odds say, and what thousands of simulated games show about how games are won."
    >
      <JsonLd data={article({ path: PATH, headline: TITLE, description: DESCRIPTION, datePublished: "2026-10-01", dateModified: "2026-10-01" })} />
      <JsonLd data={breadcrumb(PATH, "Strategy")} />

      <p>
        New to the game? Start with <Link className={link} href="/how-to-play">how to play</Link>. Every
        square number below counts along your own route: 1–4 is your private entry lane, 5–12 the shared middle lane, 13–14
        your private exit.
      </p>

      <H2>1. Know the dice</H2>
      <p>Four two-sided pyramid dice give a bell curve. A 2 is the most common throw; 0 and 4 are rare.</p>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Throw</th>
            <th className={th}>Chance</th>
            <th className={th}>Out of 16</th>
          </tr>
        </thead>
        <tbody>
          {DICE.map((d) => (
            <tr key={d.n}>
              <td className={td}>{d.n}</td>
              <td className={td}>{pct(d.sixteenths)}</td>
              <td className={td}>{d.sixteenths}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        The average throw is exactly 2 squares, and 1 throw in 16 is a 0 that wastes your turn. Plan your moves around 1, 2
        and 3, which together come up 14 times in 16.
      </p>

      <H2>2. Measure danger by distance</H2>
      <p>
        A piece in the shared lane can only be captured by an enemy piece 1 to 4 squares behind it, and only if the enemy
        throws exactly that distance. Your risk next turn is the chance of that throw:
      </p>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Enemy piece behind you by</th>
            <th className={th}>Chance it can hit you next throw</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>1 square</td><td className={td}>25%</td></tr>
          <tr><td className={td}>2 squares</td><td className={td}>37.5% (the most dangerous gap)</td></tr>
          <tr><td className={td}>3 squares</td><td className={td}>25%</td></tr>
          <tr><td className={td}>4 squares</td><td className={td}>6.25%</td></tr>
          <tr><td className={td}>5 or more</td><td className={td}>0%, safe for one throw</td></tr>
        </tbody>
      </table>
      <p>
        With two attackers at different distances, add their chances: enemies 1 and 2 squares behind you can hit 62.5% of
        the time. When you must stand in the lane, prefer being 4 or 5+ squares ahead of an enemy, never 2.
      </p>

      <H2>3. Captures decide games</H2>
      <p>
        In our simulations, whenever one player made more captures than the other, that player won <strong>77–78%</strong>{" "}
        of the time. A capture sends a piece back to the start and erases every square it had travelled. At an average
        of 2 squares a throw, a piece on square 12 represents about six throws of progress, while one on square 5 is
        barely two. Hit pieces that have travelled far.
      </p>

      <H2>4. Hold the central rosette</H2>
      <p>
        Square 8, the rosette in the middle of the shared lane, is the best square on the board: it gives an extra throw,
        it cannot be captured, and your opponent cannot land on it while you sit there. A piece parked on it also blocks
        their pieces from using it. A common plan is to park a piece there early, move your others around it, and release
        it late in the race.
      </p>

      <H2>5. Rosettes are tempo</H2>
      <p>
        Each rosette landing is a free extra throw, worth an average of 2 more squares. In our games, the two players landed
        on rosettes about <strong>25–29 times per game</strong> combined, so they shape the race. Your entry rosette
        (square 4) and exit rosette (square 14) are private and completely safe. A throw of 4 brings a new piece straight
        onto square 4 and throws again.
      </p>

      <H2>6. Bear off on the best numbers</H2>
      <p>A piece needs an exact throw to leave the board, so where it waits matters:</p>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}>Waiting on square</th>
            <th className={th}>Throw needed</th>
            <th className={th}>Chance per throw</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className={td}>14</td><td className={td}>1</td><td className={td}>25%</td></tr>
          <tr><td className={td}>13</td><td className={td}>2</td><td className={td}>37.5% (best)</td></tr>
          <tr><td className={td}>12</td><td className={td}>3</td><td className={td}>25%</td></tr>
          <tr><td className={td}>11</td><td className={td}>4</td><td className={td}>6.25%</td></tr>
        </tbody>
      </table>
      <p>
        Squares 13 and 14 are private, so a piece there can wait in safety. Don&apos;t use a good throw to inch a waiting
        piece forward when another piece needs it more.
      </p>

      <H2>7. Going first helps a little</H2>
      <p>
        Light moves first. Over 4,000 games between two equal mid-strength engines, the first player won{" "}
        <strong>52.3%</strong> (±1.5%); over 1,000 games between two stronger engines, <strong>55.2%</strong> (±3.1%). It is a
        real edge but a small one, and the dice and your choices matter far more. The site&apos;s AI lets you play either
        side.
      </p>

      <H2>8. It&apos;s not over until it&apos;s over, usually</H2>
      <p>
        In games where one player fell three or more pieces behind in pieces brought home, the trailing player still won{" "}
        <strong>9–11%</strong> of the time. Captures late in the race are what make comebacks possible, so a player who is
        behind should keep pieces in the shared lane rather than rushing them home.
      </p>

      <H2>Skill or luck?</H2>
      <p>
        Both, but skill wins out. A simple strategy (prefer captures, rosettes and progress) beat a player making random
        legal moves <strong>92.5%</strong> of the time, and a stronger positional engine won <strong>97.5%</strong>. A whole
        game lasts about 140–155 throws between the two players, plenty of decisions for good choices to add up.
      </p>

      <H2>How these numbers were made</H2>
      <p>
        The dice odds are exact arithmetic. The game statistics come from thousands of seeded games played automatically
        through the same rules engine and computer opponents this site uses: 4,000 games between two Medium engines,
        1,000 between two Hard engines, and 400 per tier for the skill comparison. Ranges are 95% confidence margins.
        Simulated opponents are not people, so treat the figures as a strong guide rather than a law.
      </p>

      <H2>Practise it</H2>
      <ul className={UL}>
        <li>Play the computer and turn on hints to see the engine&apos;s preferred move and why.</li>
        <li>After a game, use Analyze to find your mistakes and blunders.</li>
        <li>Try the daily challenge: one position a day, one best move.</li>
      </ul>
      <Link href="/" className="btn btn-primary mt-2 w-full rounded-xl px-5 py-3 text-center text-base font-medium sm:w-auto sm:self-start">
        Play and practise now
      </Link>
    </SiteShell>
  );
}
