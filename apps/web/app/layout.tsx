import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeEffect } from "@/components/ThemeEffect";

export const metadata: Metadata = {
  title: "Royal Game of Ur",
  description:
    "The world's oldest playable board game, brought into the modern world — authentic British Museum rules, honest AI opponents, and verified replays.",
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
      </body>
    </html>
  );
}
