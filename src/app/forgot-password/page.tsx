"use client";

import { useState } from "react";
import { Mail, Package } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { supabaseClient } from "@/lib/supabase-client";

export default function ForgotPasswordPage() {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!email.trim() || !email.toLowerCase().endsWith("@gmail.com")) {
      setError(t("gmailRequired"));
      return;
    }
    setLoading(true);
    setError("");

    const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(
      email,
      { redirectTo: "https://tawsil.vercel.app/reset-password" }
    );

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
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
            {t("forgotPasswordTitle")}
          </h1>
          <p className="text-slate-500 text-sm">{t("forgotPasswordSubtitle")}</p>
        </div>

        {sent ? (
          <div className="card text-center">
            <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-slate-700 text-sm mb-4">{t("resetLinkSent")}</p>
            <a
              href="/login"
              className="text-indigo-600 text-sm font-medium hover:underline"
            >
              {t("backToLogin")}
            </a>
          </div>
        ) : (
          <div className="card space-y-4">
            <div>
              <label className="label">{t("email")}</label>
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
                    setError("");
                  }}
                  placeholder="nom@gmail.com"
                  className={`input !pl-10 ${error ? "border-red-400" : ""}`}
                  dir="ltr"
                />
              </div>
              {error && (
                <p className="text-red-500 text-xs mt-1">{error}</p>
              )}
            </div>

            <button
              onClick={submit}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? t("sending") : t("sendResetLink")}
            </button>

            <p className="text-center text-sm text-slate-500">
              <a
                href="/login"
                className="text-indigo-600 font-medium hover:underline"
              >
                {t("backToLogin")}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
