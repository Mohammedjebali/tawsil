"use client";

import { useState, useEffect, Suspense } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { supabaseClient } from "@/lib/supabase-client";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#6366f1", fontSize: "1.1rem", fontWeight: 600 }}>Loading...</div></div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
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
    if (confirmed) return; // Let the confirmed=1 handler check metadata first
    const saved = localStorage.getItem("tawsil_user");
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (user.role === "customer") { window.location.href = "/app"; return; }
        if (user.role === "rider" && user.status === "active") { window.location.href = "/rider"; return; }
      } catch (_) {}
    }
  }, [confirmed]);

  // Rebuild localStorage from Supabase metadata for OAuth returning users
  useEffect(() => {
    if (!confirmed) return;
    async function rebuildFromAuth() {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      const meta = user.user_metadata || {};
      if (!meta.phone || !meta.first_name) {
        window.location.href = "/register/complete-profile";
        return;
      }
      localStorage.setItem("tawsil_user", JSON.stringify({
        name: `${meta.first_name || ""} ${meta.last_name || ""}`.trim(),
        firstName: meta.first_name || "",
        lastName: meta.last_name || "",
        email: user.email,
        phone: meta.phone || "",
        role: "customer",
      }));
      window.location.href = "/app";
    }
    rebuildFromAuth();
  }, [confirmed]);

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
      if (meta.first_name?.trim() && user.email?.trim() && meta.phone?.trim()) {
        try {
          await fetch("/api/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: user.id,
              first_name: meta.first_name,
              last_name: meta.last_name || "",
              email: user.email,
              phone: meta.phone,
              ...(meta.referred_by ? { referred_by: meta.referred_by } : {}),
            }),
          });
        } catch (_) {}
      }
      window.location.href = "/app";
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
            {/* Google OAuth */}
            <button
              onClick={async () => {
                await supabaseClient.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: window.location.origin + "/auth/callback" },
                });
              }}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 10,
                border: "1px solid #E2E8F0", background: "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                fontSize: "0.9rem", fontWeight: 600, color: "#0f172a",
                cursor: "pointer", transition: "background 0.15s",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.1 24.1 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              {t("continueWithGoogle")}
            </button>

            {/* Facebook OAuth */}
            <button
              onClick={async () => {
                await supabaseClient.auth.signInWithOAuth({
                  provider: "facebook",
                  options: { redirectTo: window.location.origin + "/auth/callback" },
                });
              }}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 10,
                border: "1px solid #E2E8F0", background: "#1877F2",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                fontSize: "0.9rem", fontWeight: 600, color: "#ffffff",
                cursor: "pointer", transition: "background 0.15s",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48" fill="white"><path d="M48 24C48 10.7 37.3 0 24 0S0 10.7 0 24c0 11.8 8.6 21.7 19.9 23.6v-16.7h-5.9V24h5.9v-5.1c0-5.9 3.5-9.1 8.9-9.1 2.6 0 5.3.5 5.3.5v5.8h-3c-2.9 0-3.8 1.8-3.8 3.7V24h6.5l-1 6.9h-5.5v16.7C39.4 45.7 48 35.8 48 24z"/></svg>
              {t("continueWithFacebook")}
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
              <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 500 }}>— {t("or")} —</span>
              <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
            </div>

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
