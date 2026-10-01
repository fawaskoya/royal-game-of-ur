import { OG_SIZE, renderOgImage } from "@/lib/site/og";

export const alt = "How to play the Royal Game of Ur";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return renderOgImage({ title: "How to Play", subtitle: "Rules, board and dice odds — learn the Royal Game of Ur in five minutes" });
}
