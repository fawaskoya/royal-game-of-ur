import { SiteShell, H2, A, UL } from "@/components/site/SiteShell";
import { pageMeta } from "@/lib/site/meta";
import { CONTACT_EMAIL, CONTACT_HREF } from "@/lib/contact";

export const metadata = pageMeta(
  "/terms",
  "Terms of Service",
  "The terms for using Royal Game of Ur: fair play, accounts, online games, optional cosmetic purchases, donations and liability.",
);

export default function TermsPage() {
  return (
    <SiteShell title="Terms of Service" intro="Plain-language rules for using the site. By using Royal Game of Ur you agree to them.">
      <p className="text-xs text-[var(--ink-dim)]">Last updated: 1 October 2026</p>

      <H2>1. The service</H2>
      <p>
        Royal Game of Ur (&quot;the Service&quot;) is a free web game at royalgameofur.app. You can play without an account. Some
        features, such as online matches and the ladder, use a guest or registered account.
      </p>

      <H2>2. Fair play and acceptable use</H2>
      <ul className={UL}>
        <li>Play fairly. Do not use bots, scripts, modified clients or exploits to gain an advantage, or to disrupt other players or the Service.</li>
        <li>Do not attempt to attack, overload, probe or reverse-engineer our servers, or to access data that isn&apos;t yours.</li>
        <li>Choose a player name that is not offensive, hateful or impersonating anyone. We may change or remove names that are.</li>
        <li>Do not harass other players.</li>
      </ul>

      <H2>3. Accounts</H2>
      <p>
        You are responsible for your account and for keeping your password safe. Guest accounts are tied to your browser
        and may be lost if you clear your browser data. You can register an email address to keep your account. We may
        suspend or remove accounts that break these terms.
      </p>

      <H2>4. Online games, ratings and forfeits</H2>
      <ul className={UL}>
        <li>In online games the server throws the dice and checks every move.</li>
        <li>Each turn has a time limit. If your clock runs out, your opponent may claim the win. Resigning counts as a loss.</li>
        <li>Ratings and ladder positions are for fun and may be reset, adjusted or corrected, for example after a bug or database migration.</li>
        <li>Online play depends on the internet and third-party services, and we cannot guarantee it is always available.</li>
      </ul>

      <H2>5. Optional purchases (the Store)</H2>
      <p>
        The Store sells cosmetic items only: boards, dice, pieces and flair. They never affect dice, rules or your chances. A
        single one-time payment of US$1.99 unlocks every cosmetic that is sold in the Store, now and as the Store grows,
        for the lifetime of the Service. Some items can only be earned in play and are not for sale. Purchases are
        processed by Dodo Payments as merchant of record, and taxes may be added at checkout. Cosmetics are a licence to
        use digital items in the Service, are not transferable and have no cash value. See our{" "}
        <A href="/refunds">Refund Policy</A>.
      </p>

      <H2>6. Donations</H2>
      <p>
        Donations are voluntary gifts that help keep the game running. They do not buy any feature or advantage, and are
        non-refundable except where the law requires otherwise.
      </p>

      <H2>7. Our content and yours</H2>
      <p>
        The site&apos;s software, artwork and text belong to us or our licensors. You may play the game and share links and
        screenshots. You keep ownership of anything you send us. The game&apos;s rules are based on historical sources and
        scholarship and are not owned by us.
      </p>

      <H2>8. No warranty</H2>
      <p>
        The Service is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind, to the fullest extent permitted by
        law. We do not promise that it will be uninterrupted, error-free or that games, ratings or saved data will never be
        lost.
      </p>

      <H2>9. Limitation of liability</H2>
      <p>
        To the fullest extent permitted by law, we are not liable for indirect, incidental or consequential losses arising
        from your use of the Service, and our total liability for any claim is limited to the amount you paid us in the 12
        months before the claim (or US$10 if you paid nothing). Nothing in these terms limits liability that cannot be
        limited by law, or your statutory consumer rights.
      </p>

      <H2>10. Changes and ending</H2>
      <p>
        We may update the Service and these terms. We will change the date above when we do, and continuing to use the
        Service means you accept the update. You can stop using the Service at any time; we can end or restrict access for
        breach of these terms.
      </p>

      <H2>11. Contact</H2>
      <p>
        Questions about these terms: <A href={CONTACT_HREF}>{CONTACT_EMAIL}</A>. See also our <A href="/privacy">Privacy Policy</A>.
      </p>
    </SiteShell>
  );
}
