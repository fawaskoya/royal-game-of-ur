import { OG_SIZE, renderOgImage } from "@/lib/site/og";

export const alt = "Royal Game of Ur strategy guide";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return renderOgImage({ title: "Strategy Guide", subtitle: "What the odds and thousands of simulated games say about winning" });
}
