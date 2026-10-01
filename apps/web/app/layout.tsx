import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeEffect } from "@/components/ThemeEffect";
import { CosmeticsEffect } from "@/components/CosmeticsEffect";
import { CONTACT_EMAIL } from "@/lib/contact";
import { JsonLd, ORGANIZATION_ID, WEBSITE_ID } from "@/lib/site/jsonld";
import { SITE_NAME, SITE_URL } from "@/lib/site/meta";

const SITE_TITLE = "Royal Game of Ur — Play the World's Oldest Board Game Online";
// ~155 characters: what Google shows before truncating.
const SITE_DESCRIPTION =
  "Play the Royal Game of Ur free in your browser — the 4,500-year-old board game, with Irving Finkel's rules. Play the AI, a friend, or online. No ads.";

// Search-console ownership tags, set per environment (no code change needed).
const verification: Metadata["verification"] = {
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
  ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s · Royal Game of Ur" },
  description: SITE_DESCRIPTION,
  applicationName: "Royal Game of Ur",
  keywords: [
    "Royal Game of Ur",
    "Game of Ur online",
    "ancient board game",
    "Mesopotamian board game",
    "Irving Finkel rules",
    "British Museum board game",
    "oldest board game in the world",
    "play board game online free",
    "Ur board game rules",
  ],
  category: "Games",
  authors: [{ name: "Royal Game of Ur" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192" }],
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "Game of Ur",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Royal Game of Ur",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Royal Game of Ur" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  verification,
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0e14",
};

// Site-wide entity graph: who publishes the site and what the site is. The
// game itself (VideoGame) is described on the homepage. No ratings/reviews:
// those need real, verifiable data; inventing them risks a manual action.
const SITE_GRAPH = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: SITE_NAME,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png`, width: 512, height: 512 },
      email: CONTACT_EMAIL,
      contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: CONTACT_EMAIL },
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      name: SITE_NAME,
      alternateName: ["Game of Ur", "Royal Game of Ur Online"],
      url: SITE_URL,
      inLanguage: "en",
      publisher: { "@id": ORGANIZATION_ID },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <JsonLd data={SITE_GRAPH} />
        <ThemeEffect />
        <CosmeticsEffect />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
