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
      if (user.role === "customer") window.location.href = "/";
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
        minHeight: "100dvh",
        background: "linear-gradient(160deg, #4338ca 0%, #6366f1 40%, #7c3aed 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}>
        <div style={{
          width: "80px", height: "80px", borderRadius: "50%",
          background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)",
          border: "1.5px solid rgba(255,255,255,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: "20px",
        }}>
          <span style={{ fontSize: "2.5rem" }}>📧</span>
        </div>
        <h1 style={{ color: "white", fontSize: "1.75rem", fontWeight: 800, marginBottom: 8, textAlign: "center" }}>
          {t("checkGmail")}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", textAlign: "center", maxWidth: 320, marginBottom: 32 }}>
          {t("confirmationSent")}
        </p>
        <button
          onClick={resend}
          disabled={resendLoading}
          style={{
            background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)",
            color: "white", padding: "12px 32px", borderRadius: 16, fontSize: "0.875rem",
            fontWeight: 600, cursor: "pointer", backdropFilter: "blur(10px)",
          }}
        >
          {resendLoading ? t("sending") : resendDone ? t("emailResent") : t("resendEmail")}
        </button>
        <a href="/login" style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", marginTop: 16, textDecoration: "none" }}>
          {t("backToLogin")}
        </a>
      </div>
    );
  }

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%", padding: "14px 16px", borderRadius: 14,
    border: `1.5px solid ${hasError ? "#f87171" : "#e2e8f0"}`,
    fontSize: "0.9rem", outline: "none", background: "#f8fafc",
    transition: "border-color 0.2s",
  });

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
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>🛵</div>
        <div style={{ color: "white", fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.04em" }}>Tawsil</div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", marginTop: 6 }}>إنشاء حساب جديد</div>
      </div>

      {/* White card */}
      <div style={{
        background: "white", borderRadius: "28px 28px 0 0",
        padding: "32px 24px", minHeight: "60vh",
        boxShadow: "0 -20px 60px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Name row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>{t("firstName")} *</label>
              <input
                type="text" value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setErrors((p) => ({ ...p, firstName: "" })); }}
                style={inputStyle(!!errors.firstName)}
              />
              {errors.firstName && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: 4 }}>{errors.firstName}</p>}
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>{t("lastName")} *</label>
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
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>{t("email")} *</label>
            <input
              type="email" value={email} dir="ltr"
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
              style={inputStyle(!!errors.email)}
            />
            {errors.email && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: 4 }}>{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>{t("phone")} *</label>
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
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>{t("password")} *</label>
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
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>{t("confirmPassword")} *</label>
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
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              🎁 {t("referralCodeOptional")}
            </label>
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
            style={{
              width: "100%", padding: "14px", borderRadius: 16, border: "none",
              background: "linear-gradient(135deg, #6366f1, #4338ca)",
              color: "white", fontSize: "1rem", fontWeight: 700, cursor: "pointer",
              opacity: loading ? 0.6 : 1, marginTop: 4,
              boxShadow: "0 8px 24px rgba(99,102,241,0.35)",
            }}
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
