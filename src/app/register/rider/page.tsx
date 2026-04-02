"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { useLang } from "@/components/LangProvider";

export default function RiderRegister() {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"form" | "pending" | "rejected">("form");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tawsil_user");
    if (saved) {
      const user = JSON.parse(saved);
      if (user.role === "rider") {
        if (user.status === "active") {
          window.location.href = "/rider";
          return;
        }
        if (user.status === "pending") {
          setName(user.name);
          setPhone(user.phone);
          setStatus("pending");
        }
        if (user.status === "rejected") {
          setStatus("rejected");
        }
      }
    }
  }, []);

  async function submit() {
    if (!name.trim() || !phone.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/riders/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const rider = data.rider;
      localStorage.setItem("tawsil_user", JSON.stringify({
        name: rider.name,
        phone: rider.phone,
        role: "rider",
        status: rider.status,
        rider_id: rider.id,
      }));

      if (rider.status === "active") {
        window.location.href = "/rider";
      } else if (rider.status === "rejected") {
        setStatus("rejected");
      } else {
        setStatus("pending");
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus() {
    setChecking(true);
    try {
      const res = await fetch(`/api/riders/status?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (data.status === "active") {
        const saved = localStorage.getItem("tawsil_user");
        if (saved) {
          const user = JSON.parse(saved);
          user.status = "active";
          localStorage.setItem("tawsil_user", JSON.stringify(user));
        }
        window.location.href = "/rider";
      } else if (data.status === "rejected") {
        setStatus("rejected");
        const saved = localStorage.getItem("tawsil_user");
        if (saved) {
          const user = JSON.parse(saved);
          user.status = "rejected";
          localStorage.setItem("tawsil_user", JSON.stringify(user));
        }
      }
    } finally {
      setChecking(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "14px 16px", borderRadius: 14,
    border: "1.5px solid #e2e8f0", fontSize: "0.9rem", outline: "none",
    background: "#f8fafc", transition: "border-color 0.2s",
  };

  if (status === "rejected") {
    return (
      <div style={{
        minHeight: "100dvh",
        background: "linear-gradient(160deg, #4338ca 0%, #6366f1 40%, #7c3aed 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}>
        <div style={{
          width: "80px", height: "80px", borderRadius: "50%",
          background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)",
          border: "1.5px solid rgba(255,255,255,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
        }}>
          <span style={{ fontSize: "2.5rem" }}>❌</span>
        </div>
        <h1 style={{ color: "white", fontSize: "1.75rem", fontWeight: 800, marginBottom: 8, textAlign: "center" }}>{t("rejected")}</h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", textAlign: "center", maxWidth: 320, marginBottom: 32 }}>{t("rejectedDesc")}</p>
        <button
          onClick={() => { localStorage.removeItem("tawsil_user"); window.location.href = "/"; }}
          style={{
            background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)",
            color: "white", padding: "12px 32px", borderRadius: 16, fontSize: "0.875rem",
            fontWeight: 600, cursor: "pointer", backdropFilter: "blur(10px)",
          }}
        >
          {t("backToHome")}
        </button>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div style={{
        minHeight: "100dvh",
        background: "linear-gradient(160deg, #4338ca 0%, #6366f1 40%, #7c3aed 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}>
        <div style={{
          width: "80px", height: "80px", borderRadius: "50%",
          background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)",
          border: "1.5px solid rgba(255,255,255,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
        }}>
          <span style={{ fontSize: "2.5rem" }}>⏳</span>
        </div>
        <h1 style={{ color: "white", fontSize: "1.75rem", fontWeight: 800, marginBottom: 8, textAlign: "center" }}>{t("pendingApproval")}</h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", textAlign: "center", maxWidth: 320, marginBottom: 32 }}>{t("pendingDesc")}</p>
        <button
          onClick={checkStatus} disabled={checking}
          style={{
            background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.3)",
            color: "white", padding: "12px 32px", borderRadius: 16, fontSize: "0.875rem",
            fontWeight: 600, cursor: "pointer", backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
          }}
        >
          <RefreshCw size={16} className={checking ? "animate-spin" : ""} />
          {checking ? t("checking") : t("checkStatus")}
        </button>
        <button
          onClick={() => { localStorage.removeItem("tawsil_user"); window.location.href = "/"; }}
          style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.7)", padding: "10px 24px", borderRadius: 12,
            fontSize: "0.8rem", fontWeight: 500, cursor: "pointer",
          }}
        >
          {t("logout")}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(160deg, #4338ca 0%, #6366f1 40%, #7c3aed 100%)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Decorative circles */}
      <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
      <div style={{ position: "absolute", top: "80px", left: "-40px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

      {/* Top section */}
      <div style={{ padding: "60px 24px 32px", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>🏍️</div>
        <div style={{ color: "white", fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.04em" }}>Tawsil</div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", marginTop: 6 }}>انضم كراكب توصيل</div>
      </div>

      {/* White card */}
      <div style={{
        background: "white", borderRadius: "28px 28px 0 0",
        padding: "32px 24px", minHeight: "60vh",
        boxShadow: "0 -20px 60px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>{t("name")} *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>{t("phone")} *</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" style={inputStyle} />
          </div>

          {/* Review warning */}
          <div style={{
            background: "#eef2ff", border: "1.5px solid #c7d2fe", borderRadius: 14, padding: 16,
          }}>
            <p style={{ color: "#4338ca", fontSize: "0.85rem", fontWeight: 500, lineHeight: 1.6 }}>
              {t("reviewWarning")}
            </p>
          </div>

          <button
            onClick={submit}
            disabled={loading || !name.trim() || !phone.trim()}
            style={{
              width: "100%", padding: "14px", borderRadius: 16, border: "none",
              background: "linear-gradient(135deg, #6366f1, #4338ca)",
              color: "white", fontSize: "1rem", fontWeight: 700, cursor: "pointer",
              opacity: loading || !name.trim() || !phone.trim() ? 0.6 : 1,
              boxShadow: "0 8px 24px rgba(99,102,241,0.35)", marginTop: 4,
            }}
          >
            {loading ? t("registering") : t("register")}
          </button>
        </div>
      </div>
    </div>
  );
}
