import type { Metadata } from "next";

export const SITE_URL = "https://royalgameofur.app";
export const SITE_NAME = "Royal Game of Ur";

/**
 * Per-page metadata: an exact title (absolute — titles are written to fit
 * ~60 characters with the brand already in them, so the layout template must
 * not append it again), a canonical URL, and a matching Open Graph block. The
 * share image is the route's own card when it has an `opengraph-image` file
 * (pass `ownImage`), otherwise the site card. An explicit image here overrides
 * the file convention, so it must name the right one.
 */
export function pageMeta(
  path: string,
  title: string,
  description: string,
  { ownImage = false }: { ownImage?: boolean } = {},
): Metadata {
  const image = { url: ownImage ? `${path}/opengraph-image` : "/opengraph-image", width: 1200, height: 630, alt: title };
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: { type: "article", url: path, siteName: SITE_NAME, title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}
