/** Static site pages — the single list the menu footer and SiteShell link from. */
export interface SiteLink {
  readonly href: string;
  readonly label: string;
}

export const SITE_LINKS: readonly SiteLink[] = [
  { href: "/how-to-play", label: "How to play" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refunds", label: "Refunds" },
];
