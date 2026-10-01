import { OG_SIZE, renderOgImage } from "@/lib/site/og";

export const alt = "Royal Game of Ur — the world's oldest playable board game";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return renderOgImage({
    title: "Royal Game of Ur",
    subtitle: "The world's oldest playable board game — play free online",
  });
}
