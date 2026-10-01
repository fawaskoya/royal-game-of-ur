import Link from "next/link";
import { SiteShell, H2, UL } from "@/components/site/SiteShell";
import { BoardDiagram } from "@/components/site/BoardDiagram";
import { PrintButton } from "@/components/site/PrintButton";
import { pageMeta } from "@/lib/site/meta";
import { JsonLd, article, breadcrumb } from "@/lib/site/jsonld";

const PATH = "/printable-board";
const TITLE = "Printable Royal Game of Ur Board — Free, Print at Home";
const DESCRIPTION =
  "Print a free Royal Game of Ur board and pieces on one sheet, and play with four coins instead of pyramid dice — same odds. Rules summary included.";

export const metadata = pageMeta(PATH, TITLE, DESCRIPTION, { ownImage: true });

const link = "text-[var(--gold)] underline underline-offset-2";

function Pieces({ dark }: { dark: boolean }) {
  return (
    <svg viewBox="0 0 7 1" className="w-full max-w-md" role="img" aria-label={`Seven ${dark ? "dark" : "light"} pieces to cut out`}>
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i}>
          <circle cx={i + 0.5} cy={0.5} r={0.4} fill={dark ? "#000" : "#fff"} stroke="#000" strokeWidth={0.03} />
          <circle cx={i + 0.5} cy={0.5} r={0.08} fill={dark ? "#fff" : "#000"} />
        </g>
      ))}
    </svg>
  );
}

export default function PrintableBoardPage() {
  return (
    <SiteShell
      title="Printable Royal Game of Ur Board"
      intro="Everything you need to play at a table: print one sheet, cut out fourteen pieces, grab four coins."
    >
      <JsonLd data={article({ path: PATH, headline: TITLE, description: DESCRIPTION, datePublished: "2026-10-01", dateModified: "2026-10-01" })} />
      <JsonLd data={breadcrumb(PATH, "Printable board")} />

      <PrintButton />
      <p className="text-sm text-[var(--ink-dim)]">
        Prints in black and white on a single A4 or US Letter page in landscape. Only the board, pieces and rules print, not
        this page.
      </p>

      <div className="print-sheet flex flex-col gap-4 rounded-xl bg-white p-4 text-black">
        <div className="text-center font-display text-lg">The Royal Game of Ur</div>
        <BoardDiagram
          numbered={false}
          print
          label="A blank Royal Game of Ur board to print: three rows of squares with two gaps, and five rosettes."
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <div className="text-xs">Light pieces (cut out)</div>
            <Pieces dark={false} />
          </div>
          <div>
            <div className="text-xs">Dark pieces (cut out)</div>
            <Pieces dark />
          </div>
        </div>
        <ol className="ml-5 list-decimal text-[11px] leading-snug">
          <li>Light sits along the bottom row, Dark along the top. Light goes first.</li>
          <li>Toss four coins: each head counts 1. Move one piece that many squares (0 = turn lost).</li>
          <li>Enter at the fourth square from the left of your row, run left, then along the middle row to the right, then back along your row to the exit.</li>
          <li>Land on ✿ to throw again. The middle ✿ is safe: no capture there.</li>
          <li>Land on an opponent in the middle row to send it back to start.</li>
          <li>Bear off with an exact throw. First to bring all seven home wins.</li>
        </ol>
      </div>

      <H2>No pyramid dice? Use four coins</H2>
      <p>
        The original game uses four tetrahedral dice, each with two of its four corners marked, so each one is a fair 50/50
        between 0 and 1. A coin toss is exactly the same: count each head as 1. Four coins give the same odds as four
        pyramid dice: 0 or 4 one time in sixteen, 1 or 3 four times in sixteen, and 2 six times in sixteen.
      </p>

      <H2>What you need</H2>
      <ul className={UL}>
        <li>The printed sheet (thicker paper or card is nicer).</li>
        <li>Fourteen pieces: cut out the circles, or use seven coins of one kind and seven of another, or draughts/checkers.</li>
        <li>Four coins to throw.</li>
      </ul>

      <p>
        New to the game? Read <Link className={link} href="/how-to-play">how to play</Link>, or skip the printer and{" "}
        <Link className={link} href="/">play online</Link> against the computer or a friend.
      </p>
    </SiteShell>
  );
}
