import { SiteShell, H2, A, UL } from "@/components/site/SiteShell";
import { pageMeta } from "@/lib/site/meta";
import { JsonLd, breadcrumb } from "@/lib/site/jsonld";
import { CONTACT_EMAIL, CONTACT_HREF } from "@/lib/contact";

export const metadata = pageMeta(
  "/contact",
  "Contact · Royal Game of Ur",
  "Contact Royal Game of Ur for support, bug reports, refund requests, privacy requests or press.",
);

export default function ContactPage() {
  return (
    <SiteShell title="Contact" intro="The fastest way to reach us is email.">
      <JsonLd data={breadcrumb("/contact", "Contact")} />
      <p className="text-lg">
        <A href={CONTACT_HREF}>{CONTACT_EMAIL}</A>
      </p>
      <p>We reply within a few business days.</p>

      <H2>What to write to us about</H2>
      <ul className={UL}>
        <li>Bug reports and confusing moments in the game</li>
        <li>Purchase or donation questions, and <A href="/refunds">refund requests</A></li>
        <li>Account, data access or deletion requests (see the <A href="/privacy">Privacy Policy</A>)</li>
        <li>Press, partnerships and feature ideas</li>
      </ul>

      <H2>Reporting a bug</H2>
      <p>The more of this you can include, the faster we can fix it:</p>
      <ul className={UL}>
        <li>What you were doing (for example, &quot;online match, my second turn&quot;)</li>
        <li>What you expected and what happened instead</li>
        <li>Your device and browser (for example, iPhone Safari, or Windows Chrome)</li>
        <li>For online games, the room code or your player name, and roughly when it happened</li>
        <li>A screenshot, if you can</li>
      </ul>

      <H2>Purchases</H2>
      <p>
        For a payment issue, include the email you used at checkout and the date of the purchase. Payments are processed by
        Dodo Payments, who send your receipt.
      </p>
    </SiteShell>
  );
}
