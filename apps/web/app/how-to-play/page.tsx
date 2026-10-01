import Link from "next/link";
import { SiteShell, H2, UL } from "@/components/site/SiteShell";
import { BoardDiagram } from "@/components/site/BoardDiagram";
import { pageMeta } from "@/lib/site/meta";
import { JsonLd, article, breadcrumb } from "@/lib/site/jsonld";

const PATH = "/how-to-play";
const TITLE = "How to Play the Royal Game of Ur: Rules, Dice & Board";
const DESCRIPTION =
  "Learn the Royal Game of Ur in five minutes: the board, the four pyramid dice and their odds, rosettes, captures and bearing off — Irving Finkel's rules.";

export const metadata = pageMeta(PATH, TITLE, DESCRIPTION, { ownImage: true });

const FAQ: { q: string; a: string }[] = [
  {
    q: "How many pieces does each player have?",
    a: "Seven. Each player races all seven pieces along their own route and off the board; the first player to bear off all seven wins.",
  },
  {
    q: "How do the dice work?",
    a: "You throw four tetrahedral (pyramid-shaped) dice, each with two marked corners. Each die counts 0 or 1, so a throw is 0 to 4. A 2 is the most likely result (6 in 16); 0 and 4 are rare (1 in 16 each). A throw of 0 forfeits your turn.",
  },
  {
    q: "What do the rosettes do?",
    a: "Landing on a rosette gives you another throw. The central rosette in the shared lane is also safe: while a piece sits there it cannot be captured, and your opponent cannot land on it.",
  },
  {
    q: "How does capturing work?",
    a: "If you land on an opponent's piece in the shared middle lane, it goes back to their start. Pieces on the private squares at either end can never be captured.",
  },
  {
    q: "Do I need an exact throw to bear a piece off?",
    a: "Yes. A piece leaves the board only by an exact throw to the exit; if your throw would overshoot, that piece cannot move.",
  },
  {
    q: "Can I pass if I do not like my move?",
    a: "No. If any legal move exists you must make one. You only pass when you throw 0 or no piece can legally move.",
  },
  {
    q: "Are these the real ancient rules?",
    a: "They are the best-known modern reconstruction: Irving Finkel's, built from a Babylonian cuneiform tablet in the British Museum. Nobody knows exactly how it was played 4,500 years ago, but this version is the one scholars and most players use.",
  },
  {
    q: "Is it free?",
    a: "Yes. There are no ads and nothing you can buy makes you stronger. An optional one-time Store purchase unlocks cosmetic boards, dice and pieces only.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function HowToPlayPage() {
  return (
    <SiteShell
      title="How to Play the Royal Game of Ur"
      intro="A race game for two, played for at least 4,500 years. You can learn it in five minutes: throw the dice, move one piece, and bring all seven home before your opponent does."
    >
      <JsonLd data={FAQ_JSON_LD} />
      <JsonLd data={article({ path: PATH, headline: TITLE, description: DESCRIPTION, datePublished: "2026-10-01", dateModified: "2026-10-01" })} />
      <JsonLd data={breadcrumb(PATH, "How to play")} />

      <Link href="/" className="btn btn-primary w-full rounded-xl px-5 py-3 text-center text-base font-medium sm:w-auto sm:self-start">
        Play now — free, no sign-up
      </Link>

      <H2>The goal</H2>
      <p>
        Each player has seven pieces. Light moves first. Race every one of your pieces along your route, through the
        shared middle lane, and off the far end of the board. The first player to bear off all seven wins. There are no
        draws.
      </p>

      <H2>The board and your route</H2>
      <p>
        The board has 20 squares: a block of four on each side, a connecting bridge, and two squares at each end. Each
        player has a private lane of four squares to start and two to finish. The eight squares in the middle are shared,
        and that is where the fighting happens. Both players travel the shared lane in the same direction.
      </p>
      <BoardDiagram label="The Royal Game of Ur board: 20 squares in three rows, with Light's route numbered 1 to 14. Squares 1 to 4 are Light's private entry lane, 5 to 12 are the shared middle lane, and 13 to 14 are the private exit." />
      <p className="text-xs text-[var(--ink-dim)]">
        Light&apos;s route, numbered. Squares 1–4 are your private entry lane, 5–12 the shared lane, 13–14 your private
        exit; then off the board. Dark takes the mirror-image route along the top row. The ✿ squares are rosettes.
      </p>

      <H2>The dice</H2>
      <p>
        You throw four pyramid-shaped dice, each with two of its four corners marked. Every die counts 0 or 1, so the total
        is between 0 and 4 and tells you how many squares to move. The odds per throw:
      </p>
      <ul className={UL}>
        <li>0 squares: 1 in 16 (you lose the turn)</li>
        <li>1 square: 4 in 16</li>
        <li>2 squares: 6 in 16 (the most common)</li>
        <li>3 squares: 4 in 16</li>
        <li>4 squares: 1 in 16</li>
      </ul>

      <H2>Taking a turn</H2>
      <ul className={UL}>
        <li>Throw the dice. On a 0, or if no piece can legally move, your turn passes.</li>
        <li>
          Otherwise you must move exactly one piece exactly that many squares. A throw of 2 brings a new piece onto the
          second square of your entry lane, or moves a piece already on the board two squares forward.
        </li>
        <li>You can never land on a square holding one of your own pieces.</li>
        <li>If more than one move is possible, the choice is yours. That choice is the whole game.</li>
      </ul>

      <H2>Rosettes</H2>
      <p>
        There are five rosette squares; each player uses three. Landing on a rosette gives you another throw, and turns can
        chain. The rosette at the centre of the shared lane (your square 8) is also <strong>safe</strong>: a piece resting
        there cannot be captured, and your opponent cannot land on it while it is occupied. Holding it is one of the
        strongest positions in the game.
      </p>

      <H2>Capturing</H2>
      <p>
        If you land on an opponent&apos;s piece in the shared lane, that piece is sent back to its owner&apos;s start and
        must begin again. Captures can only happen in the shared lane (squares 5–12), never on the private squares at
        either end, and never on the central rosette.
      </p>

      <H2>Bearing off</H2>
      <p>
        To leave the board a piece needs an <strong>exact</strong> throw to the exit square beyond your last square. If
        your throw would overshoot, that piece cannot move this turn. Expect to wait for the right number — plan for it.
      </p>

      <H2>Strategy tips</H2>
      <ul className={UL}>
        <li>
          <strong>Take the centre early.</strong> Park a piece on the central rosette and leave it. It is safe, it blocks your
          opponent, and it gives you a free throw when you land there.
        </li>
        <li>
          <strong>Rosettes are tempo.</strong> An extra throw is worth more than most single moves; the entry and exit
          rosettes are also free throws and never in danger.
        </li>
        <li>
          <strong>Count the danger.</strong> A piece on the shared lane can be hit by any enemy piece 1–4 squares behind it.
          Since 2 is the likeliest throw, being exactly two squares ahead of an enemy piece is the riskiest place to stand.
        </li>
        <li>
          <strong>Don&apos;t rush pieces home.</strong> A piece on your private exit lane is perfectly safe and can wait for
          its exact bear-off throw while you use other pieces.
        </li>
        <li>
          <strong>Hit when it hurts.</strong> Capturing a piece that has travelled far costs your opponent many turns;
          capturing one that has barely entered costs little and may expose you.
        </li>
        <li>
          <strong>Keep options.</strong> Having several movable pieces lets you avoid a forced bad move.
        </li>
      </ul>
      <p>
        The <Link className="text-[var(--gold)] underline underline-offset-2" href="/strategy">full strategy guide</Link>{" "}
        puts numbers on all of this, from exact capture odds to how much the first move is worth.
      </p>

      <H2>A short history</H2>
      <p>
        The Royal Game of Ur is named for the ancient Sumerian city of Ur in what is now southern Iraq. Boards were found
        there in the royal cemetery during excavations led by Sir Leonard Woolley in the 1920s, and one of them is in the
        British Museum. The boards date to about 2600 BCE. Variants of the game were played across the ancient Near East for
        well over two thousand years.
      </p>
      <p>
        The rules were not written down with the boards. Assyriologist Irving Finkel of the British Museum reconstructed how
        the game was played from a Babylonian cuneiform tablet, dated 177 BCE and written by the scribe Itti-Marduk-balāṭu.
        This site uses his reconstruction. There is much more to the story in the{" "}
        <Link className="text-[var(--gold)] underline underline-offset-2" href="/history">history of the Royal Game of Ur</Link>.
        To play it against a computer, a friend, or a stranger online, start a game from the{" "}
        <Link className="text-[var(--gold)] underline underline-offset-2" href="/">home page</Link>.
      </p>

      <H2>Frequently asked questions</H2>
      <dl className="flex flex-col gap-3">
        {FAQ.map((f) => (
          <div key={f.q}>
            <dt className="font-medium text-[var(--gold)]">{f.q}</dt>
            <dd className="mt-0.5 text-[var(--ink-dim)]">{f.a}</dd>
          </div>
        ))}
      </dl>

      <Link href="/" className="btn btn-primary mt-2 w-full rounded-xl px-5 py-3 text-center text-base font-medium sm:w-auto sm:self-start">
        Start your first game
      </Link>
    </SiteShell>
  );
}
