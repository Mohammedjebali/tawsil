import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "edge";

export default function Image() {
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
          background: "linear-gradient(135deg, #060818 0%, #0f1629 50%, #060818 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 500,
            height: 500,
            background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            width: 120,
            height: 120,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 80px rgba(99,102,241,0.6)",
            marginBottom: 40,
          }}
        >
          <span style={{ fontSize: 64, fontWeight: 900, color: "#fff" }}>T</span>
        </div>
        <div style={{ fontSize: 80, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em" }}>
          Tawsil
        </div>
        <div style={{ fontSize: 24, color: "#818cf8", marginTop: 16, fontWeight: 600 }}>
          Fast Delivery — Monastir
        </div>
        <div style={{ fontSize: 18, color: "#475569", marginTop: 24 }}>
          tawsildelivery.com
        </div>
      </div>
    ),
    { ...size }
  );
}
