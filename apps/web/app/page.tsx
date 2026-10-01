import type { Metadata } from "next";
import { GameApp } from "@/components/GameApp";
import { HomeContent } from "@/components/site/HomeContent";
import { JsonLd, ORGANIZATION_ID } from "@/lib/site/jsonld";
import { SITE_URL } from "@/lib/site/meta";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const VIDEO_GAME = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "Royal Game of Ur",
  alternateName: ["Game of Ur", "Game of Twenty Squares"],
  description:
    "The 4,500-year-old Mesopotamian race game, played by Irving Finkel's reconstruction of the rules: against six levels of computer opponent, a friend on one screen, or online.",
  url: SITE_URL,
  image: `${SITE_URL}/opengraph-image`,
  inLanguage: "en",
  genre: ["Board game", "Race game", "Strategy"],
  gamePlatform: ["Web browser"],
  applicationCategory: "GameApplication",
  operatingSystem: "Any (web browser)",
  playMode: ["SinglePlayer", "MultiPlayer"],
  numberOfPlayers: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2 },
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" },
  publisher: { "@id": ORGANIZATION_ID },
};

export default function Home() {
  return (
    <>
      <JsonLd data={VIDEO_GAME} />
      <GameApp />
      <HomeContent />
    </>
  );
}
