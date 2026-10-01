import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell, UL } from "@/components/site/SiteShell";
import { SITE_LINKS } from "@/lib/site/pages";

export const metadata: Metadata = {
  title: { absolute: "Page not found · Royal Game of Ur" },
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <SiteShell title="This square is empty" intro="The page you were looking for isn't here — it may have moved.">
      <Link href="/" className="btn btn-primary w-full rounded-xl px-5 py-3 text-center text-base font-medium sm:w-auto sm:self-start">
        Play the Royal Game of Ur
      </Link>
      <p>Or try one of these:</p>
      <ul className={UL}>
        {SITE_LINKS.slice(0, 5).map((l) => (
          <li key={l.href}>
            <Link className="text-[var(--gold)] underline underline-offset-2" href={l.href}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </SiteShell>
  );
}
