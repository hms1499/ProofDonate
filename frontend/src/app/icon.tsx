import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A1628",
          borderRadius: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontFamily: "serif",
            lineHeight: 1,
          }}
        >
          <span style={{ fontSize: 38, fontStyle: "italic", color: "#34D399" }}>
            P
          </span>
          <span style={{ fontSize: 38, color: "#ffffff" }}>D</span>
        </div>
      </div>
    ),
    size
  );
}
