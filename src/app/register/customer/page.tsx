"use client";

import { useState, useEffect } from "react";
import { User, Phone, Mail, Lock, Eye, EyeOff, Package, Gift } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { supabaseClient } from "@/lib/supabase-client";

export default function CustomerRegister() {
  const { t, isRtl } = useLang();
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

    // Pre-fill referral code from URL param
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
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-indigo-50 border-2 border-indigo-200 rounded-full flex items-center justify-center mx-auto mb-5">
            <Mail className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {t("checkGmail")}
          </h1>
          <p className="text-slate-500 text-sm mb-6">{t("confirmationSent")}</p>
          <button
            onClick={resend}
            disabled={resendLoading}
            className="btn-secondary"
          >
            {resendLoading
              ? t("sending")
              : resendDone
              ? t("emailResent")
              : t("resendEmail")}
          </button>
          <a
            href="/login"
            className="block mt-4 text-indigo-600 text-sm font-medium hover:underline"
          >
            {t("backToLogin")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {t("registerTitle")}
          </h1>
          <p className="text-slate-500 text-sm">{t("registerSubtitle")}</p>
        </div>

        <div className="card space-y-4">
          {/* First name + Last name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t("firstName")} *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setErrors((prev) => ({ ...prev, firstName: "" }));
                }}
                placeholder="Mohamed"
                className={`input ${errors.firstName ? "border-red-400 focus:border-red-400" : ""}`}
              />
              {errors.firstName && (
                <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label className="label">{t("lastName")} *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setErrors((prev) => ({ ...prev, lastName: "" }));
                }}
                placeholder="Ben Ali"
                className={`input ${errors.lastName ? "border-red-400 focus:border-red-400" : ""}`}
              />
              {errors.lastName && (
                <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="label">{t("email")} *</label>
            <div className="relative">
              <Mail
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                style={{ left: "14px" }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder="nom@gmail.com"
                className={`input !pl-10 ${errors.email ? "border-red-400 focus:border-red-400" : ""}`}
                dir="ltr"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="label">{t("phone")} *</label>
            <div className="relative">
              <Phone
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                style={{ left: "14px" }}
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  let v = e.target.value;
                  if (!v.startsWith("+216")) v = "+216" + v.replace(/^\+216/, "");
                  setPhone(v);
                  setErrors((prev) => ({ ...prev, phone: "" }));
                }}
                placeholder="+216 XX XXX XXX"
                className={`input !pl-10 ${errors.phone ? "border-red-400 focus:border-red-400" : ""}`}
                dir="ltr"
                maxLength={13}
              />
            </div>
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="label">{t("password")} *</label>
            <div className="relative">
              <Lock
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                style={{ left: "14px" }}
              />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: "" }));
                }}
                placeholder="••••••••"
                className={`input !pl-10 !pr-10 ${errors.password ? "border-red-400 focus:border-red-400" : ""}`}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                style={{ right: "14px" }}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="label">{t("confirmPassword")} *</label>
            <div className="relative">
              <Lock
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                style={{ left: "14px" }}
              />
              <input
                type={showConfirmPw ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => {
                  setConfirmPw(e.target.value);
                  setErrors((prev) => ({ ...prev, confirmPw: "" }));
                }}
                placeholder="••••••••"
                className={`input !pl-10 !pr-10 ${errors.confirmPw ? "border-red-400 focus:border-red-400" : ""}`}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPw(!showConfirmPw)}
                className="absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                style={{ right: "14px" }}
              >
                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPw && (
              <p className="text-red-500 text-xs mt-1">{errors.confirmPw}</p>
            )}
          </div>

          {/* Referral code */}
          <div>
            <label className="label">{t("referralCodeOptional")}</label>
            <div className="relative">
              <Gift
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                style={{ left: "14px" }}
              />
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="AMIN47"
                className="input !pl-10"
                dir="ltr"
                maxLength={6}
              />
            </div>
          </div>

          {errors.form && (
            <p className="text-red-500 text-sm text-center">{errors.form}</p>
          )}

          <button onClick={submit} disabled={loading} className="btn-primary mt-2">
            {loading ? t("signingUp") : t("register")}
          </button>

          <p className="text-center text-sm text-slate-500 mt-3">
            {t("haveAccount")}{" "}
            <a href="/login" className="text-indigo-600 font-medium hover:underline">
              {t("signIn")}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
