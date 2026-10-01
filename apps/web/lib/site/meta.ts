import type { Metadata } from "next";

/** Per-page metadata with a canonical URL and matching Open Graph block. */
export function pageMeta(path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      siteName: "Royal Game of Ur",
      title: `${title} · Royal Game of Ur`,
      description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Royal Game of Ur" }],
    },
  };
}
