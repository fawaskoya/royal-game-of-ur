import { SiteShell, H2, A, UL } from "@/components/site/SiteShell";
import { pageMeta } from "@/lib/site/meta";
import { CONTACT_EMAIL, CONTACT_HREF } from "@/lib/contact";

export const metadata = pageMeta(
  "/privacy",
  "Privacy Policy",
  "What Royal Game of Ur stores on your device and on our servers, who processes payments and analytics, and how to ask us to delete your data.",
);

export default function PrivacyPage() {
  return (
    <SiteShell
      title="Privacy Policy"
      intro="We keep this small. You can play most of the game without giving us any personal information at all."
    >
      <p className="text-xs text-[var(--ink-dim)]">Last updated: 1 October 2026</p>

      <H2>Who we are</H2>
      <p>
        &quot;Royal Game of Ur&quot;, &quot;we&quot; and &quot;us&quot; mean the operator of royalgameofur.app. You can reach us at{" "}
        <A href={CONTACT_HREF}>{CONTACT_EMAIL}</A>.
      </p>

      <H2>What stays on your device</H2>
      <p>
        Playing against the computer, playing on one screen, the tutorial, and watching AI games need no account and send
        nothing about you to our servers. To work, the site saves the following in your browser&apos;s local storage:
      </p>
      <ul className={UL}>
        <li>your settings (theme, board orientation, sound, hints and similar)</li>
        <li>your current unfinished game, so you can continue it</li>
        <li>your finished games and their replays, and your local statistics</li>
        <li>your tutorial progress</li>
        <li>your equipped and unlocked cosmetics</li>
        <li>for online play, your last player name and any unfinished online game, so you can rejoin it</li>
      </ul>
      <p>
        This data never leaves your browser unless you export it. Clearing your browser&apos;s site data deletes it. We do not
        use advertising or cross-site tracking cookies.
      </p>

      <H2>Online play and accounts</H2>
      <p>
        Online rooms, matchmaking and the ladder need a player profile. You can play as a guest (an anonymous account is
        created automatically) or register with an email address and password. For online play our server stores:
      </p>
      <ul className={UL}>
        <li>an account identifier, and your email address if you register (passwords are handled by our authentication provider and are not readable by us)</li>
        <li>a player name (generated for guests, shown to opponents and on the ladder)</li>
        <li>your games: who played, the dice throws and moves, timestamps and the result</li>
        <li>your rating, number of games played, and matchmaking queue entries</li>
        <li>cosmetic purchases you have made (what you own, when, and a payment reference)</li>
      </ul>
      <p>
        Online data is hosted with Supabase (database and authentication) in the European Union (Frankfurt). Other players
        can see your player name, rating and game results; they cannot see your email.
      </p>

      <H2>Analytics</H2>
      <p>
        We use Vercel Web Analytics to understand how the site is used. It records page views and a few anonymous product
        events (for example: a game started or finished, which mode and difficulty, a rough duration bucket, that the Store
        or Donate button was opened). It does not use cookies to track you across sites and we do not link these events to
        your name or email.
      </p>

      <H2>Payments</H2>
      <p>
        Purchases and donations are handled by <strong>Dodo Payments</strong>, which acts as the merchant of record. You enter
        your card or wallet details on Dodo&apos;s checkout page, never on ours. We do not receive or store your card number.
        Dodo tells us that a payment succeeded so that we can unlock your cosmetics. Dodo&apos;s own privacy policy governs the
        information you give them.
      </p>

      <H2>What we do not do</H2>
      <ul className={UL}>
        <li>We do not show ads.</li>
        <li>We do not sell or rent your personal information.</li>
        <li>We do not build advertising profiles or share data with data brokers.</li>
      </ul>

      <H2>Service providers</H2>
      <p>
        We rely on: Vercel (hosting and analytics), Supabase (online database and authentication), and Dodo Payments
        (payments). They process data only to provide those services to us.
      </p>

      <H2>How long we keep data</H2>
      <p>
        Online game records and ratings are kept while your account exists. Purchase records are kept as long as needed to
        honour your purchase and for accounting and legal obligations. Analytics events are kept for the period set by our
        analytics provider.
      </p>

      <H2>Your choices and rights</H2>
      <ul className={UL}>
        <li>To delete local data: clear this site&apos;s data in your browser, or use Clear stats in the Stats screen.</li>
        <li>
          To access, correct or delete your online account and game data, email <A href={CONTACT_HREF}>{CONTACT_EMAIL}</A> from
          the address on your account (or tell us your player name). We will respond within a reasonable time and in any
          case within the period required by law.
        </li>
        <li>Depending on where you live, you may have further rights, such as objecting to processing or complaining to your local data protection authority.</li>
      </ul>

      <H2>Children</H2>
      <p>
        The game is suitable for all ages, but online accounts are intended for people old enough to consent to data
        processing where they live. If you believe a child has given us personal information, contact us and we will delete
        it.
      </p>

      <H2>Changes</H2>
      <p>
        If we change this policy we will update the date above, and for significant changes we will say so on the site.
      </p>

      <H2>Contact</H2>
      <p>
        Questions about privacy: <A href={CONTACT_HREF}>{CONTACT_EMAIL}</A>.
      </p>
    </SiteShell>
  );
}
