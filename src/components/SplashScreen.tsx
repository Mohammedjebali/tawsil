"use client";

import { useEffect, useRef, useState } from "react";

interface SplashScreenProps {
  onDone?: () => void;
  splashDone?: boolean;
  onDismiss?: () => void;
}

export default function SplashScreen({ onDone, splashDone, onDismiss }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [textVisible, setTextVisible] = useState(false);
  const [slideUp, setSlideUp] = useState(false);
  const minPassed = useRef(false);
  const dataDone = useRef(false);

  function triggerSlideUp() {
    if (slideUp) return;
    setSlideUp(true);
    setTimeout(() => {
      onDismiss?.();
      onDone?.();
    }, 650);
  }

  useEffect(() => {
    const textTimer = setTimeout(() => setTextVisible(true), 500);

    const minTimer = setTimeout(() => {
      minPassed.current = true;
      if (dataDone.current) triggerSlideUp();
    }, 1800);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(minTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (splashDone === true || onDone) {
      dataDone.current = true;
      if (minPassed.current) triggerSlideUp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splashDone]);

  // If used with simple onDone (AppWrapper), auto-dismiss after min time
  useEffect(() => {
    if (onDone && !onDismiss) {
      const t = setTimeout(() => triggerSlideUp(), 2200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);

    const NODE_COUNT = 24;
    const INDIGO = "#6366f1";
    const CONNECT_DIST = 140;

    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      pulse: number;
    }

    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 3 + Math.random() * 2.5,
      pulse: Math.random() * Math.PI * 2,
    }));

    let animId: number;

    function draw() {
      ctx!.clearRect(0, 0, W, H);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.5;
            ctx!.strokeStyle = `rgba(226,232,240,${alpha * 2})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(nodes[i].x, nodes[i].y);
            ctx!.lineTo(nodes[j].x, nodes[j].y);
            ctx!.stroke();
          }
        }
      }

      nodes.forEach((n) => {
        n.pulse += 0.04;
        const scale = 1 + Math.sin(n.pulse) * 0.25;

        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r * scale * 2.5, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(99,102,241,0.06)";
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx!.fillStyle = INDIGO;
        ctx!.fill();

        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      });

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  const isReady = splashDone === true;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: slideUp ? "translateY(-100%)" : "translateY(0)",
        opacity: slideUp ? 0 : 1,
        transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1), opacity 0.5s ease",
        pointerEvents: slideUp ? "none" : "all",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      <div style={{ position: "relative", zIndex: 10, textAlign: "center" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            background: "#6366f1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: "0 8px 32px rgba(99,102,241,0.35)",
            opacity: textVisible ? 1 : 0,
            transform: textVisible ? "scale(1) translateY(0)" : "scale(0.7) translateY(10px)",
            transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
            <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="9" y="11" width="14" height="10" rx="2" stroke="white" strokeWidth="2"/>
            <circle cx="12" cy="21" r="1" fill="white"/>
            <circle cx="20" cy="21" r="1" fill="white"/>
          </svg>
        </div>

        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 30,
            fontWeight: 900,
            color: "#0f172a",
            letterSpacing: 2,
            opacity: textVisible ? 1 : 0,
            transform: textVisible ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.5s ease 0.15s, transform 0.5s ease 0.15s",
          }}
        >
          توصيل
        </div>

        <div
          style={{
            fontSize: 10,
            color: "#94a3b8",
            letterSpacing: 4,
            marginTop: 10,
            textTransform: "uppercase",
            fontFamily: "Arial, sans-serif",
            opacity: textVisible ? 1 : 0,
            transition: "opacity 0.5s ease 0.35s",
          }}
        >
          {isReady ? "Ready" : "Initializing..."}
        </div>

        <div
          style={{
            width: 80,
            height: 2,
            background: "#e2e8f0",
            borderRadius: 2,
            margin: "14px auto 0",
            overflow: "hidden",
            opacity: textVisible ? 1 : 0,
            transition: "opacity 0.5s ease 0.4s",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "#6366f1",
              borderRadius: 2,
              width: isReady ? "100%" : "60%",
              transition: "width 0.8s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}
