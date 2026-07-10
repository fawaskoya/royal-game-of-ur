import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeEffect } from "@/components/ThemeEffect";

export const metadata: Metadata = {
  title: "Royal Game of Ur",
  description:
    "The world's oldest playable board game, brought into the modern world — authentic British Museum rules, honest AI opponents, and verified replays.",
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
};

export const viewport: Viewport = {
  themeColor: "#0b0e14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ThemeEffect />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
