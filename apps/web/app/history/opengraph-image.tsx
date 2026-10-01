import { OG_SIZE, renderOgImage } from "@/lib/site/og";

export const alt = "History of the Royal Game of Ur";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return renderOgImage({ title: "A 4,500-Year History", subtitle: "From the Royal Cemetery at Ur to a Babylonian rule tablet" });
}
