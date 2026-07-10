import type { MetadataRoute } from "next";

const SITE_URL = "https://royalgameofur.app";

// A single-page app today — one URL, kept as its own file so it's a natural
// place to add routes to (e.g. /rules, /blog) without restructuring later.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
