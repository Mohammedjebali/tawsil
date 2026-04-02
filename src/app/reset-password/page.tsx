"use client";

import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, Package, CheckCircle2 } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { supabaseClient } from "@/lib/supabase-client";

export default function ResetPasswordPage() {
  const { t } = useLang();
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase sends the user here with access_token in hash
    supabaseClient.auth.getSession().then(() => {
      setSessionReady(true);
    });
  }, []);

  async function submit() {
    if (password.length < 8) {
      setError(t("passwordMinLength"));
      return;
    }
    if (password !== confirmPw) {
      setError(t("passwordMismatch"));
      return;
    }
    setLoading(true);
    setError("");

    const { error: updateError } = await supabaseClient.auth.updateUser({
      password,
    });

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      window.location.href = "/login";
    }, 2000);
  }

  if (!sessionReady) return null;

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {t("passwordUpdated")}
          </h1>
          <p className="text-slate-500 text-sm">{t("backToLogin")}...</p>
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
            {t("resetPasswordTitle")}
          </h1>
          <p className="text-slate-500 text-sm">{t("resetPasswordSubtitle")}</p>
        </div>

        <div className="card space-y-4">
          {/* New password */}
          <div>
            <label className="label">{t("newPassword")}</label>
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
                  setError("");
                }}
                placeholder="••••••••"
                className="input !pl-10 !pr-10"
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
          </div>

          {/* Confirm password */}
          <div>
            <label className="label">{t("confirmPassword")}</label>
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
                  setError("");
                }}
                placeholder="••••••••"
                className="input !pl-10 !pr-10"
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
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? t("updating") : t("updatePassword")}
          </button>
        </div>
      </div>
    </div>
  );
}
