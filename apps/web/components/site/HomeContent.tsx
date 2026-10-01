import Link from "next/link";
import { SITE_LINKS } from "@/lib/site/pages";

const linkClass = "text-[var(--gold)] underline underline-offset-2";

/**
 * Below-the-fold homepage content: the words search engines (and curious
 * players) need, under the full-screen menu. Server-rendered, zero client JS.
 * Hidden while a game is on screen — GameApp sets <html data-screen="play">.
 */
export function HomeContent() {
  return (
    <section
      aria-labelledby="home-about"
      className="home-content mx-auto w-full max-w-3xl px-5 pb-16 pt-10 text-[0.95rem] leading-relaxed text-[var(--ink)]"
    >
      <h2 id="home-about" className="font-display gold-text text-2xl sm:text-3xl">
        Play the Royal Game of Ur online
      </h2>
      <p className="mt-3 text-[var(--ink-dim)]">
        The Royal Game of Ur is a two-player race game from ancient Mesopotamia, first played around 2600 BCE and among the
        oldest board games whose rules can still be reconstructed. This is a free, ad-free version you can play in any
        browser, using the rules Irving Finkel of the British Museum reconstructed from a Babylonian clay tablet.
      </p>

      <h3 className="font-display mt-8 text-xl text-[var(--gold)]">Ways to play</h3>
      <ul className="ml-5 mt-2 list-disc space-y-1.5">
        <li>
          <strong>Against the computer</strong> — six levels, from Beginner to Master. The AI never sees future dice and
          never cheats; harder levels simply choose better.
        </li>
        <li>
          <strong>Two players, one screen</strong> — pass-and-play on a phone, tablet or laptop.
        </li>
        <li>
          <strong>Online</strong> — find a match and climb a rated ladder, or open a private room and share a four-letter
          code with a friend. The server throws the dice, so no one can fix a roll.
        </li>
        <li>
          <strong>Daily challenge</strong> — one position a day, the same for everyone. Find the best move and keep your
          streak.
        </li>
        <li>
          <strong>Learn by playing</strong> — an interactive two-minute tutorial, opening tips for your first moves, and
          post-game analysis that marks your best moves and your blunders.
        </li>
      </ul>

      <h3 className="font-display mt-8 text-xl text-[var(--gold)]">The rules in one minute</h3>
      <p className="mt-2">
        Each player races seven pieces along a 14-square route and off the board. Throw four pyramid dice to get a move of
        0 to 4. Land on a rosette for another throw; the central rosette is also safe. Land on an opponent in the shared
        middle lane to send that piece back to the start. Bearing off needs an exact throw. First to bring all seven home
        wins. The full guide is in <Link className={linkClass} href="/how-to-play">how to play the Royal Game of Ur</Link>,
        and the odds behind good play are in the <Link className={linkClass} href="/strategy">strategy guide</Link>.
      </p>

      <h3 className="font-display mt-8 text-xl text-[var(--gold)]">A game buried with royalty</h3>
      <p className="mt-2">
        Sir Leonard Woolley found the finest boards in the Royal Cemetery at Ur, in what is now southern Iraq, in the 1920s;
        one is on display in the British Museum. Versions of the game spread across the ancient Near East and were played
        for thousands of years. Read the full <Link className={linkClass} href="/history">history of the Royal Game of Ur</Link>,
        or <Link className={linkClass} href="/printable-board">print a board</Link> to play at the table.
      </p>

      <nav aria-label="Guides and site pages" className="mt-10 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--gold-faint)] pt-4 text-sm">
        {SITE_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-[var(--ink-dim)] underline-offset-2 hover:text-[var(--gold)] hover:underline">
            {l.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
