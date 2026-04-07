"use client";

import { useState, useEffect } from "react";
import { Store, ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase-client";

const CATEGORIES = ["restaurant", "grocery", "pharmacy", "bakery", "cafe", "supermarket"];

export default function StoreOwnerRegisterPage() {
  const { t, isRtl } = useLang();
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  // Step 1: account creation
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Authenticated user id (set after step 1)
  const [userId, setUserId] = useState<string | null>(null);

  // Step 2: store details
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("restaurant");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [openingTime, setOpeningTime] = useState("08:00");
  const [closingTime, setClosingTime] = useState("22:00");
  const [deliveryFee, setDeliveryFee] = useState("1500");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");

    if (!email.trim()) { setAuthError(t("required")); return; }
    if (password.length < 8) { setAuthError(t("passwordMinLength")); return; }
    if (password !== confirmPw) { setAuthError(t("passwordMismatch")); return; }

    setAuthLoading(true);

    const { data, error: signUpError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { role: "store_owner" } },
    });

    if (signUpError) {
      // If already registered, try signing in instead
      if (signUpError.message?.toLowerCase().includes("already registered")) {
        const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (signInError) {
          setAuthLoading(false);
          setAuthError(t("wrongCredentials"));
          return;
        }
        if (signInData.user) {
          setUserId(signInData.user.id);
          setStep(2);
        }
      } else {
        setAuthError(signUpError.message);
      }
      setAuthLoading(false);
      return;
    }

    if (data.user) {
      setUserId(data.user.id);
      setStep(2);
    }
    setAuthLoading(false);
  }

  async function handleGoogleSignUp() {
    await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/store-owner/register?step=2" },
    });
  }

  // On mount, check if returning from OAuth with a session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("step") === "2") {
      supabaseClient.auth.getUser().then(({ data }) => {
        if (data.user) {
          setUserId(data.user.id);
          setStep(2);
        }
      });
    }
  }, []);

  async function handleSubmitStore(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_id: userId,
          name: name.trim(),
          description: description.trim() || null,
          category,
          phone: phone.trim() || null,
          address: address.trim() || null,
          opening_time: openingTime || null,
          closing_time: closingTime || null,
          delivery_fee: parseInt(deliveryFee) || 1500,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }

      setSuccess(true);
    } catch (err) {
      setError(String(err));
    }
    setLoading(false);
  }

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%", padding: "12px 16px", borderRadius: 10,
    border: `1px solid ${hasError ? "#f87171" : "#E2E8F0"}`,
    fontSize: "0.9rem", outline: "none", background: "#ffffff",
    color: "#0f172a", transition: "border-color 0.15s",
  });

  // --- Success screen ---
  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center" dir={isRtl ? "rtl" : "ltr"}>
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t("storeRegistered")}</h2>
        <p className="text-slate-500 mb-2">{t("storePendingApproval")}</p>
        <p className="text-sm text-slate-400 mb-6">{t("storePendingDesc")}</p>
        <Link href="/store-owner" className="btn-primary inline-block no-underline">
          {t("storeOwnerDashboard")}
        </Link>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh", background: "#F8FAFC",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
    }} dir={isRtl ? "rtl" : "ltr"}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: "2rem", fontWeight: 900, color: "#6366f1", letterSpacing: "-0.05em" }}>Tawsil</div>
        <div style={{ fontSize: "0.875rem", color: "#64748b", marginTop: 6 }}>
          {step === 1 ? t("createAccountDesc") : t("storeDetailsDesc")}
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 20,
        padding: "28px 24px", width: "100%", maxWidth: 440,
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.07)",
      }}>
        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "#6366f1", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.8rem", fontWeight: 700,
          }}>1</div>
          <div style={{ flex: 1, height: 2, background: step === 2 ? "#6366f1" : "#E2E8F0", borderRadius: 2, transition: "background 0.3s" }} />
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: step === 2 ? "#6366f1" : "#E2E8F0",
            color: step === 2 ? "#fff" : "#94a3b8",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.8rem", fontWeight: 700, transition: "all 0.3s",
          }}>2</div>
        </div>

        <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, marginBottom: 6 }}>
          {step === 1 ? t("step1of2") : t("step2of2")}
        </div>

        {/* ---- STEP 1: Create account ---- */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
              {t("createYourAccount")}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Store size={18} className="text-indigo-500" />
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{t("registerStoreDesc")}</span>
            </div>

            {/* Google OAuth */}
            <button
              onClick={handleGoogleSignUp}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 10,
                border: "1px solid #E2E8F0", background: "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                fontSize: "0.9rem", fontWeight: 600, color: "#0f172a",
                cursor: "pointer", transition: "background 0.15s", marginBottom: 16,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.1 24.1 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              {t("signUpWithGoogle")}
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
              <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 500 }}>— {t("or")} —</span>
              <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
            </div>

            <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Email */}
              <div>
                <label className="label">{t("email")} <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="email" value={email} dir="ltr"
                  onChange={(e) => { setEmail(e.target.value); setAuthError(""); }}
                  style={inputStyle(!!authError)}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="label">{t("password")} <span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"} value={password} dir="ltr"
                    onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                    style={{ ...inputStyle(!!authError), paddingRight: 44 }}
                    required
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="label">{t("confirmPassword")} <span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPw ? "text" : "password"} value={confirmPw} dir="ltr"
                    onChange={(e) => { setConfirmPw(e.target.value); setAuthError(""); }}
                    style={{ ...inputStyle(!!authError), paddingRight: 44 }}
                    required
                  />
                  <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                    {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {authError && <p style={{ color: "#ef4444", fontSize: "0.875rem", textAlign: "center" }}>{authError}</p>}

              <button
                type="submit" disabled={authLoading}
                className="btn-primary"
                style={{ opacity: authLoading ? 0.6 : 1, border: "none", cursor: "pointer" }}
              >
                {authLoading ? t("creatingAccount") : t("createAccount")}
              </button>

              <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#64748b", marginTop: 4 }}>
                {t("alreadyHaveAccount")}{" "}
                <a href="/login" style={{ color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>{t("signIn")}</a>
              </p>
            </form>
          </div>
        )}

        {/* ---- STEP 2: Store details ---- */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
              {t("storeDetails")}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Store size={18} className="text-indigo-500" />
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{t("registerStoreDesc")}</span>
            </div>

            <form onSubmit={handleSubmitStore} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Store name */}
              <div>
                <label className="label">{t("storeName")} <span style={{ color: "#ef4444" }}>*</span></label>
                <input style={inputStyle()} value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              {/* Description */}
              <div>
                <label className="label">{t("storeDescription")}</label>
                <textarea style={{ ...inputStyle(), resize: "vertical" }} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              {/* Category */}
              <div>
                <label className="label">{t("storeCategory")}</label>
                <select style={inputStyle()} value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{t(c)}</option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div>
                <label className="label">{t("storePhone")}</label>
                <input style={inputStyle()} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              {/* Address */}
              <div>
                <label className="label">{t("storeAddress")}</label>
                <input style={inputStyle()} value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>

              {/* Hours */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">{t("storeOpeningTime")}</label>
                  <input style={inputStyle()} type="time" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} />
                </div>
                <div>
                  <label className="label">{t("storeClosingTime")}</label>
                  <input style={inputStyle()} type="time" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} />
                </div>
              </div>

              {/* Delivery fee */}
              <div>
                <label className="label">{t("storeDeliveryFee")}</label>
                <input
                  style={inputStyle()}
                  type="number"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  min="0"
                />
                <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }}>1500 = 1.500 {t("dt")}</p>
              </div>

              {error && <p style={{ color: "#ef4444", fontSize: "0.875rem", textAlign: "center" }}>{error}</p>}

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="btn-primary"
                style={{ opacity: loading ? 0.6 : 1, border: "none", cursor: "pointer" }}
              >
                {loading ? t("submitting") : t("submitRegistration")}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
