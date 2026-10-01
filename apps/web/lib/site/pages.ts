/** Static site pages — the single list the menu footer, SiteShell and homepage link from. */
export interface SiteLink {
  readonly href: string;
  readonly label: string;
}

export const SITE_LINKS: readonly SiteLink[] = [
  { href: "/how-to-play", label: "How to play" },
  { href: "/strategy", label: "Strategy" },
  { href: "/history", label: "History" },
  { href: "/printable-board", label: "Printable board" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refunds", label: "Refunds" },
];
