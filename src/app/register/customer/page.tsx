"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { supabaseClient } from "@/lib/supabase-client";

export default function CustomerRegister() {
  const { t } = useLang();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+216");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tawsil_user");
    if (saved) {
      const user = JSON.parse(saved);
      if (user.role === "customer") window.location.href = "/app";
    }

    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferralCode(ref);
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = t("required");
    if (!lastName.trim()) e.lastName = t("required");
    if (!email.trim() || !email.toLowerCase().endsWith("@gmail.com"))
      e.email = t("gmailRequired");
    if (!phone.trim() || phone.length < 12) e.phone = t("invalidPhone");
    if (password.length < 8) e.password = t("passwordMinLength");
    if (password !== confirmPw) e.confirmPw = t("passwordMismatch");
    return e;
  }

  async function submit() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setLoading(true);
    setErrors({});

    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          ...(referralCode.trim() ? { referred_by: referralCode.trim().toUpperCase() } : {}),
        },
      },
    });

    setLoading(false);

    if (error) {
      if (error.message?.toLowerCase().includes("already registered")) {
        window.location.href = "/login";
        return;
      }
      setErrors({ form: error.message });
      return;
    }

    setSuccess(true);
  }

  async function resend() {
    setResendLoading(true);
    await supabaseClient.auth.resend({ type: "signup", email });
    setResendLoading(false);
    setResendDone(true);
    setTimeout(() => setResendDone(false), 3000);
  }

  if (success) {
    return (
      <div style={{
        minHeight: "100dvh", background: "#F8FAFC",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}>
        <div style={{
          width: "72px", height: "72px", borderRadius: "50%",
          background: "#eef2ff", border: "1px solid #c7d2fe",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: "20px",
        }}>
          <span style={{ fontSize: "2rem" }}>📧</span>
        </div>
        <h1 style={{ color: "#0f172a", fontSize: "1.5rem", fontWeight: 800, marginBottom: 8, textAlign: "center" }}>
          {t("checkGmail")}
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem", textAlign: "center", maxWidth: 320, marginBottom: 32 }}>
          {t("confirmationSent")}
        </p>
        <button
          onClick={resend}
          disabled={resendLoading}
          className="btn-secondary"
          style={{ maxWidth: 240, cursor: "pointer" }}
        >
          {resendLoading ? t("sending") : resendDone ? t("emailResent") : t("resendEmail")}
        </button>
        <a href="/login" style={{ color: "#6366f1", fontSize: "0.875rem", marginTop: 16, textDecoration: "none", fontWeight: 600 }}>
          {t("backToLogin")}
        </a>
      </div>
    );
  }

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%", padding: "12px 16px", borderRadius: 10,
    border: `1px solid ${hasError ? "#f87171" : "#E2E8F0"}`,
    fontSize: "0.9rem", outline: "none", background: "#ffffff",
    color: "#0f172a", transition: "border-color 0.15s",
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
        <div style={{ fontSize: "0.875rem", color: "#64748b", marginTop: 6 }}>إنشاء حساب جديد</div>
      </div>

      {/* Card */}
      <div style={{
        background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 20,
        padding: "28px 24px", width: "100%", maxWidth: 400,
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.07)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Name row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">{t("firstName")} *</label>
              <input
                type="text" value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setErrors((p) => ({ ...p, firstName: "" })); }}
                style={inputStyle(!!errors.firstName)}
              />
              {errors.firstName && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: 4 }}>{errors.firstName}</p>}
            </div>
            <div>
              <label className="label">{t("lastName")} *</label>
              <input
                type="text" value={lastName}
                onChange={(e) => { setLastName(e.target.value); setErrors((p) => ({ ...p, lastName: "" })); }}
                style={inputStyle(!!errors.lastName)}
              />
              {errors.lastName && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: 4 }}>{errors.lastName}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="label">{t("email")} *</label>
            <input
              type="email" value={email} dir="ltr"
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
              style={inputStyle(!!errors.email)}
            />
            {errors.email && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: 4 }}>{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="label">{t("phone")} *</label>
            <input
              type="tel" value={phone} dir="ltr" maxLength={13}
              onChange={(e) => {
                let v = e.target.value;
                if (!v.startsWith("+216")) v = "+216" + v.replace(/^\+216/, "");
                setPhone(v); setErrors((p) => ({ ...p, phone: "" }));
              }}
              style={inputStyle(!!errors.phone)}
            />
            {errors.phone && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: 4 }}>{errors.phone}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="label">{t("password")} *</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"} value={password} dir="ltr"
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
                style={{ ...inputStyle(!!errors.password), paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: 4 }}>{errors.password}</p>}
          </div>

          {/* Confirm password */}
          <div>
            <label className="label">{t("confirmPassword")} *</label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirmPw ? "text" : "password"} value={confirmPw} dir="ltr"
                onChange={(e) => { setConfirmPw(e.target.value); setErrors((p) => ({ ...p, confirmPw: "" })); }}
                style={{ ...inputStyle(!!errors.confirmPw), paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPw && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: 4 }}>{errors.confirmPw}</p>}
          </div>

          {/* Referral code */}
          <div>
            <label className="label">{t("referralCodeOptional")}</label>
            <input
              type="text" value={referralCode} dir="ltr" maxLength={6}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              style={inputStyle()}
            />
          </div>

          {errors.form && <p style={{ color: "#ef4444", fontSize: "0.875rem", textAlign: "center" }}>{errors.form}</p>}

          {/* Submit */}
          <button
            onClick={submit} disabled={loading}
            className="btn-primary"
            style={{ opacity: loading ? 0.6 : 1, marginTop: 4, border: "none", cursor: "pointer" }}
          >
            {loading ? t("signingUp") : t("register")}
          </button>

          <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#64748b", marginTop: 8 }}>
            {t("haveAccount")}{" "}
            <a href="/login" style={{ color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>{t("signIn")}</a>
          </p>
        </div>
      </div>
    </div>
  );
}
