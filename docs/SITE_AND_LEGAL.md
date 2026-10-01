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

## SEO checklist (what's in place)

| Area | Where |
| --- | --- |
| Titles ≤ 60 chars, descriptions ~155, canonical per page | `lib/site/meta.ts` (`pageMeta`), homepage in `app/layout.tsx` + `app/page.tsx` |
| Share images per guide | `app/<route>/opengraph-image.tsx` via `lib/site/og.tsx`; pass `{ ownImage: true }` to `pageMeta` |
| Structured data | `lib/site/jsonld.tsx` — Organization + WebSite (layout), VideoGame (home), Article + BreadcrumbList (guides), FAQPage (rules) |
| Crawlable homepage copy | `components/site/HomeContent.tsx` (hidden during play via `html[data-screen="play"]`) |
| Sitemap / robots | `app/sitemap.ts` (bump `lastModified` when a page really changes), `app/robots.ts` |
| Strategy figures | `apps/cli/src/stats.ts` — `pnpm stats -- --games 4000 --seed 2026` reproduces every number on `/strategy` |

No fake ratings or reviews anywhere in structured data — they need real, verifiable data.

## Owner actions that code can't do (highest impact first)

1. **Google Search Console**: verify the domain (set `GOOGLE_SITE_VERIFICATION` in Vercel, or use DNS), submit `https://royalgameofur.app/sitemap.xml`, request indexing for `/`, `/how-to-play`, `/strategy`, `/history`.
2. **Bing Webmaster Tools** (also feeds DuckDuckGo/ChatGPT search): `BING_SITE_VERIFICATION`, submit the sitemap.
3. **Backlinks** — the deciding factor for a head term like "royal game of ur". Places that genuinely fit: r/boardgames and r/AncientCivilizations (share the strategy data, not an ad), Wikipedia's "Royal Game of Ur" external links (only if editors accept it), BoardGameGeek's Royal Game of Ur page (online implementations list), history/teaching blogs, and museum-education newsletters.
4. Re-run `pnpm stats` after AI changes and keep `/strategy` honest.
