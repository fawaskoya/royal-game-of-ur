import { SiteShell, H2, A, UL } from "@/components/site/SiteShell";
import { pageMeta } from "@/lib/site/meta";
import { CONTACT_EMAIL, CONTACT_HREF } from "@/lib/contact";

export const metadata = pageMeta(
  "/about",
  "About",
  "Royal Game of Ur is a free, ad-free, faithful digital version of the world's oldest playable board game, with honest AI and online play.",
);

export default function AboutPage() {
  return (
    <SiteShell
      title="About Royal Game of Ur"
      intro="A faithful, free way to play the oldest board game that can still be played — alone, with a friend, or against the world."
    >
      <p>
        Royal Game of Ur has been played since around 2600 BCE. This site is a modern digital edition built for people who
        have never heard of it as much as for people who love it. It uses Irving Finkel&apos;s British Museum
        reconstruction of the rules, and the rules engine is tested for correctness.
      </p>

      <H2>What you can do here</H2>
      <ul className={UL}>
        <li>Learn the game in an interactive tutorial, then play it.</li>
        <li>Play against the computer on six difficulty levels.</li>
        <li>Play a friend on the same screen, or in a private online room with a four-letter code.</li>
        <li>Find an online match and climb a rated ladder.</li>
        <li>Review any finished game and see where the turning points were.</li>
      </ul>

      <H2>Our promises</H2>
      <ul className={UL}>
        <li><strong>No ads.</strong> Ever.</li>
        <li><strong>No pay-to-win.</strong> The optional Store sells cosmetics only. Nothing you can buy changes the dice, the rules or your odds.</li>
        <li><strong>Honest AI.</strong> The computer never sees future dice throws and never bends the rules. Harder levels simply choose better moves.</li>
        <li><strong>Fair dice.</strong> In online games the server throws the dice, not either player.</li>
        <li><strong>Your data stays small.</strong> See the <A href="/privacy">Privacy Policy</A> for exactly what is stored.</li>
      </ul>

      <H2>Supporting the project</H2>
      <p>
        The game is free. If you enjoy it, you can leave a voluntary tip or buy the one-time cosmetics unlock from the
        menu. Both are optional and both help cover hosting and development. See the <A href="/refunds">refund policy</A>.
      </p>

      <H2>Get in touch</H2>
      <p>
        Questions, bugs, ideas or press: <A href={CONTACT_HREF}>{CONTACT_EMAIL}</A>. More on the <A href="/contact">contact page</A>.
      </p>
    </SiteShell>
  );
}
