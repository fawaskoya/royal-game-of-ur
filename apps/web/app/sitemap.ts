import type { MetadataRoute } from "next";

const SITE_URL = "https://royalgameofur.app";

// Fixed dates (not `new Date()`): a sitemap that claims every page changed
// on every request teaches crawlers to ignore lastmod.
const PAGES: { path: string; lastModified: string; changeFrequency: "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "", lastModified: "2026-10-01", changeFrequency: "weekly", priority: 1 },
  { path: "/how-to-play", lastModified: "2026-10-01", changeFrequency: "monthly", priority: 0.9 },
  { path: "/about", lastModified: "2026-10-01", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", lastModified: "2026-10-01", changeFrequency: "yearly", priority: 0.4 },
  { path: "/privacy", lastModified: "2026-10-01", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", lastModified: "2026-10-01", changeFrequency: "yearly", priority: 0.3 },
  { path: "/refunds", lastModified: "2026-10-01", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: new Date(p.lastModified),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
