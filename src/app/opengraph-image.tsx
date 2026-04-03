import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          padding: 80,
        }}
      >
        {/* Glow circle */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 500,
            height: 500,
            background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              borderRadius: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 60px rgba(99,102,241,0.5)",
            }}
          >
            <span
              style={{
                fontSize: 56,
                fontWeight: 900,
                color: "#fff",
                letterSpacing: "-0.04em",
              }}
            >
              T
            </span>
          </div>
        </div>
        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-0.04em",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          Tawsil
        </div>
        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "#94a3b8",
            textAlign: "center",
            direction: "rtl",
            marginBottom: 40,
          }}
        >
          كل ما تحتاجه يصل إلى بابك — المنستير
        </div>
        {/* URL */}
        <div
          style={{
            fontSize: 20,
            color: "#6366f1",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          tawsildelivery.com
        </div>
      </div>
    ),
    { ...size }
  );
}
