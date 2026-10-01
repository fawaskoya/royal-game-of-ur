import { OG_SIZE, renderOgImage } from "@/lib/site/og";

export const alt = "About Royal Game of Ur";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return renderOgImage({ title: "Royal Game of Ur", subtitle: "Free, ad-free, faithful rules — play the AI, a friend, or the world" });
}
