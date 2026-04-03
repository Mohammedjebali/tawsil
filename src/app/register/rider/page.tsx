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
    width: "100%", padding: "12px 16px", borderRadius: 10,
    border: "1px solid #E2E8F0", fontSize: "0.9rem", outline: "none",
    background: "#ffffff", color: "#0f172a", transition: "border-color 0.15s",
  };

  if (status === "rejected") {
    return (
      <div style={{
        minHeight: "100dvh", background: "#F8FAFC",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}>
        <div style={{
          width: "72px", height: "72px", borderRadius: "50%",
          background: "#fef2f2", border: "1px solid #fecaca",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
        }}>
          <span style={{ fontSize: "2rem", color: "#ef4444" }}>✕</span>
        </div>
        <h1 style={{ color: "#0f172a", fontSize: "1.5rem", fontWeight: 800, marginBottom: 8, textAlign: "center" }}>{t("rejected")}</h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem", textAlign: "center", maxWidth: 320, marginBottom: 32 }}>{t("rejectedDesc")}</p>
        <button
          onClick={() => { localStorage.removeItem("tawsil_user"); window.location.href = "/app"; }}
          className="btn-secondary"
          style={{ maxWidth: 240, cursor: "pointer" }}
        >
          {t("backToHome")}
        </button>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div style={{
        minHeight: "100dvh", background: "#F8FAFC",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}>
        <div style={{
          width: "72px", height: "72px", borderRadius: "50%",
          background: "#fff7ed", border: "1px solid #fed7aa",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
        }}>
          <span style={{ fontSize: "2rem" }}>⏳</span>
        </div>
        <h1 style={{ color: "#0f172a", fontSize: "1.5rem", fontWeight: 800, marginBottom: 8, textAlign: "center" }}>{t("pendingApproval")}</h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem", textAlign: "center", maxWidth: 320, marginBottom: 32 }}>{t("pendingDesc")}</p>
        <button
          onClick={checkStatus} disabled={checking}
          className="btn-primary"
          style={{ maxWidth: 280, cursor: "pointer", border: "none" }}
        >
          <RefreshCw size={16} className={checking ? "animate-spin" : ""} />
          {checking ? t("checking") : t("checkStatus")}
        </button>
        <button
          onClick={() => { localStorage.removeItem("tawsil_user"); window.location.href = "/app"; }}
          style={{
            background: "transparent", border: "1px solid #E2E8F0",
            color: "#64748b", padding: "10px 24px", borderRadius: 12,
            fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", marginTop: 12,
          }}
        >
          {t("logout")}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh", background: "#F8FAFC",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: "2rem", fontWeight: 900, color: "#6366f1", letterSpacing: "-0.05em" }}>Tawsil</div>
        <div style={{ fontSize: "0.875rem", color: "#64748b", marginTop: 6 }}>انضم كراكب توصيل</div>
      </div>

      {/* Card */}
      <div style={{
        background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 20,
        padding: "28px 24px", width: "100%", maxWidth: 400,
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.07)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="label">{t("name")} *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label className="label">{t("phone")} *</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" style={inputStyle} />
          </div>

          {/* Review warning */}
          <div style={{
            background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 12, padding: 16,
          }}>
            <p style={{ color: "#4338ca", fontSize: "0.85rem", fontWeight: 500, lineHeight: 1.6 }}>
              {t("reviewWarning")}
            </p>
          </div>

          <button
            onClick={submit}
            disabled={loading || !name.trim() || !phone.trim()}
            className="btn-primary"
            style={{
              opacity: loading || !name.trim() || !phone.trim() ? 0.6 : 1,
              marginTop: 4, border: "none", cursor: "pointer",
            }}
          >
            {loading ? t("registering") : t("register")}
          </button>
        </div>
      </div>
    </div>
  );
}
