import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeEffect } from "@/components/ThemeEffect";
import { CosmeticsEffect } from "@/components/CosmeticsEffect";

const SITE_URL = "https://royalgameofur.app";
const SITE_TITLE = "Royal Game of Ur — Play the World's Oldest Board Game Online";
const SITE_DESCRIPTION =
  "Play the Royal Game of Ur online free — a 4,500-year-old board game rediscovered in ancient Mesopotamia, played by British Museum scholar Irving Finkel's authentic rules. Play vs AI, pass-and-play, or online with a live Elo ladder. No ads, no pay-to-win.";

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
  alternates: { canonical: SITE_URL },
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
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0e14",
};

// Rich-result eligibility for search engines. No aggregateRating/review here —
// those fields require real, verifiable data; fabricating them risks a
// structured-data manual action.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "Royal Game of Ur",
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  genre: ["Board Game", "Strategy"],
  gamePlatform: "Web Browser",
  applicationCategory: "Game",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@type": "Organization", name: "Royal Game of Ur" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }} />
        <ThemeEffect />
        <CosmeticsEffect />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
