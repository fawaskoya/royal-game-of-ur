import { OG_SIZE, renderOgImage } from "@/lib/site/og";

export const alt = "Printable Royal Game of Ur board";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return renderOgImage({ title: "Printable Board", subtitle: "Print it, cut out the pieces, play with four coins" });
}
