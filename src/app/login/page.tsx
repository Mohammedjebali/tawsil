"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { supabaseClient } from "@/lib/supabase-client";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"customer" | "rider">("customer");

  // Customer fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [custError, setCustError] = useState("");
  const [custLoading, setCustLoading] = useState(false);

  // Rider fields
  const [riderPhone, setRiderPhone] = useState("");
  const [riderError, setRiderError] = useState("");
  const [riderLoading, setRiderLoading] = useState(false);

  const confirmed = searchParams.get("confirmed") === "1";

  useEffect(() => {
    const saved = localStorage.getItem("tawsil_user");
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (user.role === "customer") { window.location.href = "/"; return; }
        if (user.role === "rider" && user.status === "active") { window.location.href = "/rider"; return; }
      } catch (_) {}
    }
  }, []);

  async function submitCustomer() {
    if (!email.trim() || !password.trim()) return;
    setCustLoading(true);
    setCustError("");

    const { data, error: authError } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (authError) {
      setCustLoading(false);
      setCustError(t("wrongCredentials"));
      return;
    }

    const user = data.user;
    if (user) {
      const meta = user.user_metadata || {};
      localStorage.setItem("tawsil_user", JSON.stringify({
        name: `${meta.first_name || ""} ${meta.last_name || ""}`.trim(),
        firstName: meta.first_name || "",
        lastName: meta.last_name || "",
        email: user.email,
        phone: meta.phone || "",
        role: "customer",
      }));
      try {
        await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            first_name: meta.first_name || "",
            last_name: meta.last_name || "",
            email: user.email,
            phone: meta.phone || "",
            ...(meta.referred_by ? { referred_by: meta.referred_by } : {}),
          }),
        });
      } catch (_) {}
      window.location.href = "/";
    }
  }

  async function submitRider() {
    const phone = riderPhone.trim();
    if (!phone) return;
    setRiderLoading(true);
    setRiderError("");
    try {
      const res = await fetch(`/api/riders/status?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (!data.id) {
        setRiderError(t("riderNotFound"));
        return;
      }
      if (data.status === "pending") {
        setRiderError(t("riderPending"));
        return;
      }
      if (data.status === "rejected") {
        setRiderError(t("riderRejected"));
        return;
      }
      if (data.status === "active") {
        localStorage.setItem("tawsil_user", JSON.stringify({
          name: data.name,
          phone: data.phone,
          role: "rider",
          status: "active",
          rider_id: data.id,
        }));
        window.location.href = "/rider";
      }
    } catch (_) {
      setRiderError(t("errorOccurred"));
    } finally {
      setRiderLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 16px", borderRadius: 10,
    border: "1px solid #E2E8F0", fontSize: "0.9rem", outline: "none",
    background: "#ffffff", color: "#0f172a", transition: "border-color 0.15s",
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "10px", borderRadius: 10, fontSize: "0.875rem", fontWeight: 600,
    background: active ? "white" : "transparent",
    color: active ? "#6366f1" : "#94a3b8",
    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
    transition: "all 0.15s", border: "none", cursor: "pointer",
  });

  return (
    <div style={{
      minHeight: "100dvh", background: "#F8FAFC",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: "2rem", fontWeight: 900, color: "#6366f1", letterSpacing: "-0.05em" }}>Tawsil</div>
        <div style={{ fontSize: "0.875rem", color: "#64748b", marginTop: 6 }}>مرحباً بعودتك</div>
      </div>

      {/* Card */}
      <div style={{
        background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 20,
        padding: "28px 24px", width: "100%", maxWidth: 400,
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.07)",
      }}>
        {/* Confirmed banner */}
        {confirmed && (
          <div style={{
            background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 12,
            padding: "12px 16px", marginBottom: 20, textAlign: "center",
            color: "#059669", fontSize: "0.875rem", fontWeight: 600,
          }}>
            {t("emailConfirmed")}
          </div>
        )}

        {/* Tab switcher */}
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 12, padding: 4, marginBottom: 24 }}>
          <button style={tabStyle(tab === "customer")} onClick={() => setTab("customer")}>
            {t("customer")}
          </button>
          <button style={tabStyle(tab === "rider")} onClick={() => setTab("rider")}>
            {t("rider")}
          </button>
        </div>

        {/* Customer login */}
        {tab === "customer" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="label">{t("email")}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" style={inputStyle} />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                <a href="/forgot-password" style={{ fontSize: "0.75rem", color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>
                  {t("forgotPassword")}
                </a>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} dir="ltr"
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {custError && <p style={{ color: "#ef4444", fontSize: "0.875rem", textAlign: "center" }}>{custError}</p>}

            <button
              onClick={submitCustomer} disabled={custLoading}
              className="btn-primary"
              style={{ opacity: custLoading ? 0.6 : 1, border: "none", cursor: "pointer" }}
            >
              {custLoading ? t("signingIn") : t("login")}
            </button>

            <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#64748b" }}>
              {t("noAccount")}{" "}
              <a href="/register/customer" style={{ color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>{t("signUp")}</a>
            </p>
          </div>
        )}

        {/* Rider login */}
        {tab === "rider" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 12,
              padding: "12px 16px", textAlign: "center",
            }}>
              <p style={{ color: "#4338ca", fontSize: "0.85rem", fontWeight: 500 }}>{t("riderLoginInfo")}</p>
            </div>

            <div>
              <label className="label">{t("phone")}</label>
              <input type="tel" value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} dir="ltr" style={inputStyle} />
            </div>

            {riderError && <p style={{ color: "#ef4444", fontSize: "0.875rem", textAlign: "center" }}>{riderError}</p>}

            <button
              onClick={submitRider} disabled={riderLoading}
              className="btn-primary"
              style={{ opacity: riderLoading ? 0.6 : 1, border: "none", cursor: "pointer" }}
            >
              {riderLoading ? t("signingIn") : t("login")}
            </button>

            <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#64748b" }}>
              {t("areYouRider")}{" "}
              <a href="/register/rider" style={{ color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>{t("registerAsRiderLink")}</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
