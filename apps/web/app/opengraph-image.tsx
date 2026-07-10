import { ImageResponse } from "next/og";

// No per-request data — omit `runtime = "edge"` so this prerenders once as a
// static asset at build time instead of recomputing on every request.
export const alt = "Royal Game of Ur";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// A single rosette (the board's signature safe-square glyph), drawn the same
// way as the in-game RosetteGlyph — eight ellipse petals around a center dot.
function rosette(cx: number, cy: number, scale: number, opacity: number) {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg
      width={80 * scale}
      height={80 * scale}
      viewBox="0 0 40 40"
      style={{ position: "absolute", left: cx - 40 * scale, top: cy - 40 * scale, opacity }}
    >
      {petals.map((angle) => (
        <ellipse
          key={angle}
          cx="20"
          cy="11"
          rx="4.5"
          ry="8"
          fill="none"
          stroke="#c9a24b"
          strokeWidth="1.6"
          transform={`rotate(${angle} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="3.2" fill="#c9a24b" />
    </svg>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #0f1420 0%, #0b0e14 55%, #1a1610 100%)",
          position: "relative",
        }}
      >
        {rosette(150, 120, 1.3, 0.5)}
        {rosette(1050, 120, 1.3, 0.5)}
        {rosette(150, 510, 1.3, 0.5)}
        {rosette(1050, 510, 1.3, 0.5)}
        {rosette(600, 90, 0.9, 0.35)}

        <div
          style={{
            fontSize: 22,
            letterSpacing: 8,
            color: "#9a927e",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          c. 2600 BCE · Mesopotamia
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: "#e3c483",
            marginTop: 18,
            display: "flex",
            textAlign: "center",
          }}
        >
          Royal Game of Ur
        </div>
        <div
          style={{
            fontSize: 30,
            color: "#c8c0ab",
            marginTop: 22,
            maxWidth: 880,
            textAlign: "center",
            display: "flex",
          }}
        >
          The world&apos;s oldest playable board game — play free online
        </div>
      </div>
    ),
    { ...size },
  );
}
