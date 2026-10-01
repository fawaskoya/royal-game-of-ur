import { SiteShell, H2, A, UL } from "@/components/site/SiteShell";
import { pageMeta } from "@/lib/site/meta";
import { CONTACT_EMAIL, CONTACT_HREF } from "@/lib/contact";

export const metadata = pageMeta(
  "/refunds",
  "Refund & Cancellation Policy",
  "How to request a refund for the one-time Royal Game of Ur Store purchase, and our policy on donations. There are no subscriptions to cancel.",
);

export default function RefundsPage() {
  return (
    <SiteShell
      title="Refund & Cancellation Policy"
      intro="Buy with confidence: if the Store purchase isn't right for you, ask within 14 days and we'll sort it out."
    >
      <p className="text-xs text-[var(--ink-dim)]">Last updated: 1 October 2026</p>

      <H2>What you can buy</H2>
      <p>
        The only product is a <strong>one-time US$1.99 digital purchase</strong> that unlocks all sellable cosmetics (boards,
        dice, pieces and flair). It is delivered instantly to your account or browser after payment. There is no subscription
        and nothing renews, so there is nothing to cancel.
      </p>

      <H2>Refunds for the Store purchase</H2>
      <ul className={UL}>
        <li>You can request a refund within <strong>14 days</strong> of purchase, for any reason.</li>
        <li>
          Email <A href={CONTACT_HREF}>{CONTACT_EMAIL}</A> with the email address you used at checkout and the date of the
          purchase.
        </li>
        <li>
          Approved refunds are issued through Dodo Payments to your original payment method. Timing depends on your bank or
          card issuer and is typically 5 to 10 business days.
        </li>
        <li>After a refund, the cosmetics are removed from your account.</li>
        <li>If you were charged but did not receive your unlock, contact us and we will fix it or refund you in full, even after 14 days.</li>
        <li>If your local consumer law gives you additional rights, those still apply.</li>
      </ul>

      <H2>Donations</H2>
      <p>
        Donations are voluntary and non-refundable, except where required by law or if you were charged by mistake (for
        example, a duplicate payment). In that case, contact us promptly.
      </p>

      <H2>Cancellation</H2>
      <p>
        There are no recurring charges. You can stop using the Service at any time. To close an online account and delete
        its data, see the <A href="/privacy">Privacy Policy</A>.
      </p>

      <H2>Contact</H2>
      <p>
        <A href={CONTACT_HREF}>{CONTACT_EMAIL}</A>. We reply within a few business days. See also the{" "}
        <A href="/terms">Terms of Service</A>.
      </p>
    </SiteShell>
  );
}
