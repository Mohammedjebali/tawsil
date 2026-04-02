"use client";
import { useEffect, useState } from "react";

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"enter" | "pulse" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("pulse"), 400);
    const t2 = setTimeout(() => setPhase("exit"), 1800);
    const t3 = setTimeout(() => onDone(), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #7c3aed 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      transition: "opacity 0.5s ease",
      opacity: phase === "exit" ? 0 : 1,
    }}>
      {/* Outer ring pulse */}
      <div style={{
        position: "absolute",
        width: phase === "pulse" ? "200px" : "80px",
        height: phase === "pulse" ? "200px" : "80px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.1)",
        transition: "all 1s ease",
      }} />
      <div style={{
        position: "absolute",
        width: phase === "pulse" ? "300px" : "80px",
        height: phase === "pulse" ? "300px" : "80px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.05)",
        transition: "all 1.2s ease",
      }} />
      {/* Logo circle */}
      <div style={{
        width: "88px", height: "88px", borderRadius: "28px",
        background: "rgba(255,255,255,0.15)",
        backdropFilter: "blur(10px)",
        border: "1.5px solid rgba(255,255,255,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        transform: phase === "enter" ? "scale(0.5)" : "scale(1)",
        opacity: phase === "enter" ? 0 : 1,
        transition: "all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        zIndex: 1,
      }}>
        <span style={{ fontSize: "2.5rem" }}>🛵</span>
      </div>
      {/* Brand name */}
      <div style={{
        marginTop: "20px", zIndex: 1,
        opacity: phase === "enter" ? 0 : 1,
        transform: phase === "enter" ? "translateY(10px)" : "translateY(0)",
        transition: "all 0.5s ease 0.2s",
      }}>
        <div style={{ color: "white", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.04em", textAlign: "center" }}>
          Tawsil
        </div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", textAlign: "center", marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          توصيل منزل النور
        </div>
      </div>
      {/* Loading dots */}
      <div style={{
        position: "absolute", bottom: "60px", display: "flex", gap: "8px",
        opacity: phase === "enter" ? 0 : 1, transition: "opacity 0.3s ease 0.5s",
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: "rgba(255,255,255,0.6)",
            animation: `dot-pulse 1.2s ease ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes dot-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
