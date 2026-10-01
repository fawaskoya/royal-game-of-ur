import Link from "next/link";
import { SITE_LINKS } from "@/lib/site/pages";
import { CONTACT_EMAIL, CONTACT_HREF } from "@/lib/contact";

/** Shared chrome for the static content pages. Server component, no client JS. */
export function SiteShell({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-6 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gold-faint)] pb-4">
        <Link href="/" className="font-display text-lg text-[var(--gold)]">
          ✦ Royal Game of Ur
        </Link>
        <Link href="/" className="btn btn-primary rounded-lg px-4 py-1.5 text-sm font-medium">
          Play now
        </Link>
      </header>

      <main className="flex-1 py-8">
        <h1 className="font-display gold-text text-3xl leading-tight sm:text-4xl">{title}</h1>
        {intro ? <p className="mt-3 text-base leading-relaxed text-[var(--ink-dim)]">{intro}</p> : null}
        <div className="prose-site mt-6 flex flex-col gap-4 text-[0.95rem] leading-relaxed text-[var(--ink)]">
          {children}
        </div>
      </main>

      <footer className="border-t border-[var(--gold-faint)] pt-4 text-xs text-[var(--ink-dim)]">
        <nav aria-label="Site pages" className="flex flex-wrap gap-x-4 gap-y-1">
          {SITE_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-[var(--gold)] underline-offset-2 hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="mt-2">
          Contact:{" "}
          <a className="text-[var(--gold)] underline-offset-2 hover:underline" href={CONTACT_HREF}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </footer>
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display mt-4 text-xl text-[var(--gold)]">{children}</h2>;
}

export function A({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http") || href.startsWith("mailto:");
  return external ? (
    <a className="text-[var(--gold)] underline underline-offset-2" href={href}>
      {children}
    </a>
  ) : (
    <Link className="text-[var(--gold)] underline underline-offset-2" href={href}>
      {children}
    </Link>
  );
}

export const UL = "ml-5 list-disc space-y-1.5";
