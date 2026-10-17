import { ImageResponse } from "next/og";

export const alt = "Luluah";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Placeholder share card. Replace with your own 1200x630 design by adding src/app/opengraph-image.png.
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0c0a09" }}>
        <div style={{ width: 300, height: 300, borderRadius: 150, display: "flex",
          background: "radial-gradient(circle at 32% 28%, #ffffff 0%, #f6efe0 30%, #e2d2b0 62%, #b79a62 100%)" }} />
        <div style={{ marginLeft: 70, display: "flex", flexDirection: "column", color: "#c9a96e" }}>
          <div style={{ fontSize: 100, fontWeight: 700, letterSpacing: 10, display: "flex" }}>LULUAH</div>
          <div style={{ fontSize: 30, color: "#f5f2ec", marginTop: 14, display: "flex" }}>Gulf luxury, refined</div>
        </div>
      </div>
    ),
    size
  );
}
