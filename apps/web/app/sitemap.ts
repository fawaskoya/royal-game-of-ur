import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site/meta";

// Fixed dates (not `new Date()`): a sitemap that claims every page changed on
// every request teaches crawlers to ignore lastmod. Bump a page's date when
// its content really changes.
const PAGES: { path: string; lastModified: string; changeFrequency: "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "", lastModified: "2026-10-01", changeFrequency: "weekly", priority: 1 },
  { path: "/how-to-play", lastModified: "2026-10-01", changeFrequency: "monthly", priority: 0.9 },
  { path: "/strategy", lastModified: "2026-10-01", changeFrequency: "monthly", priority: 0.8 },
  { path: "/history", lastModified: "2026-10-01", changeFrequency: "monthly", priority: 0.8 },
  { path: "/printable-board", lastModified: "2026-10-01", changeFrequency: "monthly", priority: 0.7 },
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
