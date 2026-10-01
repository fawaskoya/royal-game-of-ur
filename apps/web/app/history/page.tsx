import Link from "next/link";
import { SiteShell, H2, UL } from "@/components/site/SiteShell";
import { pageMeta } from "@/lib/site/meta";
import { JsonLd, article, breadcrumb } from "@/lib/site/jsonld";

const PATH = "/history";
const TITLE = "History of the Royal Game of Ur (c. 2600 BCE)";
const DESCRIPTION =
  "From the Royal Cemetery at Ur to a Babylonian rule tablet and a 20th-century game in India: how the world's oldest playable board game was lost and found.";

export const metadata = pageMeta(PATH, TITLE, DESCRIPTION, { ownImage: true });

const link = "text-[var(--gold)] underline underline-offset-2";

export default function HistoryPage() {
  return (
    <SiteShell
      title="The History of the Royal Game of Ur"
      intro="Few games have a story this long. The Royal Game of Ur was played for thousands of years, forgotten, dug out of a royal tomb, and only decoded in the last few decades."
    >
      <JsonLd data={article({ path: PATH, headline: TITLE, description: DESCRIPTION, datePublished: "2026-10-01", dateModified: "2026-10-01" })} />
      <JsonLd data={breadcrumb(PATH, "History")} />

      <H2>Ur, around 2600 BCE</H2>
      <p>
        Ur was one of the great Sumerian cities of southern Mesopotamia, in what is now southern Iraq. The game takes its
        name from where its finest examples were found: the Royal Cemetery of Ur, a burial ground for the city&apos;s elite
        that dates to roughly 2600–2400 BCE. &ldquo;Royal&rdquo; describes the find-spot, not the players. The game was
        widely played, and scratched or cheap boards turn up as often as precious ones.
      </p>

      <H2>The excavation</H2>
      <p>
        The British archaeologist Sir Leonard Woolley excavated Ur in the 1920s and early 1930s, in a joint expedition of the
        British Museum and the University of Pennsylvania Museum. Among the cemetery&apos;s treasures were several gaming
        boards with twenty squares, made of wood and inlaid with shell, red limestone and lapis lazuli. One of them is on
        display in the British Museum in London. Each player&apos;s seven pieces and the pyramid-shaped dice tell us how
        the equipment worked, but no rules were buried with the boards.
      </p>

      <H2>A game that travelled</H2>
      <p>
        Scholars call this family of games the &ldquo;Game of Twenty Squares&rdquo;. Boards with the same layout have been
        found across the ancient world, from the Mediterranean to Iran and beyond, and the game was played for well over two
        thousand years. Some of the most charming examples are casual ones. A board scratched into the base of a colossal
        winged bull from the Assyrian palace at Khorsabad, now in the British Museum, is thought to have been carved by
        guards passing the time. In Egypt, the game appears on the reverse of senet boxes, including ones buried with
        Tutankhamun.
      </p>

      <H2>The rule tablet</H2>
      <p>
        The rules survive thanks to a single Babylonian clay tablet, written in cuneiform by a scribe named
        Itti-Marduk-balāṭu and dated to 177 BCE, more than two thousand years after the Ur boards were made. Irving Finkel,
        a curator of cuneiform texts at the British Museum, deciphered it and worked out how the game was played: the
        route, the four dice, the rosettes and the captures. His reconstruction is now the standard way to play, and it is
        the version on this site. The tablet also ties squares of the board to fortunes, so the game may have carried a
        layer of divination as well as play.
      </p>
      <p>
        No reconstruction can be certain. The tablet describes a late form of a game that was already ancient when it was
        written, and other rule sets exist. Finkel&apos;s is the best-attested, and it plays wonderfully.
      </p>

      <H2>The game that never quite died</H2>
      <p>
        Finkel later learned that the Jewish community of Kochi (Cochin) in southern India played a game on the same
        twenty-square layout into the twentieth century. If the line of descent is real, it is one of the longest-lived
        games in human history.
      </p>

      <H2>A modern revival</H2>
      <p>
        The game found a new audience online when the British Museum published a filmed match between Irving Finkel and the
        YouTuber Tom Scott, which has been watched by millions. Replica boards are now easy to find, and you can play it
        right here.
      </p>

      <H2>Keep exploring</H2>
      <ul className={UL}>
        <li>
          <Link className={link} href="/how-to-play">How to play</Link>: the rules, the board and the dice odds.
        </li>
        <li>
          <Link className={link} href="/strategy">Strategy guide</Link>: what the numbers say about good play.
        </li>
        <li>
          <Link className={link} href="/printable-board">Printable board</Link>: play the ancient way, on paper.
        </li>
      </ul>

      <Link href="/" className="btn btn-primary mt-2 w-full rounded-xl px-5 py-3 text-center text-base font-medium sm:w-auto sm:self-start">
        Play the Royal Game of Ur
      </Link>
    </SiteShell>
  );
}
