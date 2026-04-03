"use client";
import { useEffect, useState } from "react";

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"enter" | "pulse" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("pulse"), 200);
    const t2 = setTimeout(() => setPhase("exit"), 1200);
    const t3 = setTimeout(() => onDone(), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#ffffff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: phase === "exit" ? 0 : 1,
      transition: "opacity 0.4s ease",
    }}>
      <div style={{
        fontWeight: 900, fontSize: "3rem", letterSpacing: "-0.06em", color: "#6366f1",
        transform: phase === "enter" ? "scale(0.85)" : "scale(1)",
        opacity: phase === "enter" ? 0 : 1,
        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      }}>
        Tawsil
      </div>
      <div style={{ color: "#94a3b8", fontSize: "0.875rem", marginTop: 8, opacity: phase === "enter" ? 0 : 1, transition: "opacity 0.3s ease 0.2s" }}>
        التوصيل السريع
      </div>
      {/* Progress bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, height: 3, background: "#6366f1", borderRadius: "0 2px 2px 0",
        width: phase === "enter" ? "0%" : phase === "pulse" ? "70%" : "100%",
        transition: phase === "enter" ? "none" : phase === "pulse" ? "width 1.2s ease" : "width 0.3s ease",
      }} />
    </div>
  );
}
