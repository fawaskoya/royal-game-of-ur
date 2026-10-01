# Site pages, SEO & legal

Static, server-rendered pages (no game JS) added for search visibility and for payment-provider (Dodo Payments) review.

| Route | Purpose |
| --- | --- |
| `/how-to-play` | Full Finkel rules guide, strategy, history, FAQ (`FAQPage` JSON-LD). Primary SEO landing page. |
| `/about` | What the project is; no ads, no pay-to-win, honest AI. |
| `/contact` | Contact email and what to include in a bug report. |
| `/privacy` | Privacy policy, written from what the code actually stores (see below). |
| `/terms` | Terms of service. |
| `/refunds` | Refund & cancellation policy for the Store unlock and donations. |

Shared pieces: `components/site/SiteShell.tsx`, `lib/site/pages.ts` (`SITE_LINKS`), `lib/site/meta.ts` (`pageMeta`), `lib/contact.ts` (the one place the contact email lives), `app/sitemap.ts`.

## What the privacy page is grounded in

- **On-device (localStorage):** settings, saved game, finished-game archive, local stats, tutorial progress, cosmetics entitlements cache, daily-challenge record, achievements-announced flags.
- **Supabase (Frankfurt, `eu-central-1`):** anonymous/email accounts, display handle, ratings, online games.
- **Vercel Analytics:** page views and a small set of product events (`lib/analytics.ts`).
- **Dodo Payments:** merchant of record for the Store purchase and donations; card data never reaches us.

If any of these change, update `/privacy` in the same commit.

## Owner review checklist (not legal advice)

The wording is a competent first draft, **not reviewed by a lawyer**. Before relying on it:

1. Confirm the refund window (draft: 14 days for the $1.99 Store unlock; donations non-refundable) matches your Dodo merchant agreement.
2. Confirm the claim that Vercel Analytics is cookieless, and the data-subject-request response wording.
3. The terms cap liability at US$10 — a placeholder; set what you are comfortable with.
4. Decide whether to name a legal entity / address / governing law. None is invented; the pages say "Royal Game of Ur" plus the contact email.
5. Spot-check the history facts on `/how-to-play` (Woolley's 1920s excavation, c. 2600 BCE, Finkel's reading of the British Museum tablet).
