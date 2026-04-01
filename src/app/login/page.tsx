"use client";

import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, Package } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { supabaseClient } from "@/lib/supabase-client";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const confirmed = searchParams.get("confirmed") === "1";

  useEffect(() => {
    const saved = localStorage.getItem("tawsil_user");
    if (saved) {
      const user = JSON.parse(saved);
      if (user.role === "customer") window.location.href = "/";
    }
  }, []);

  async function submit() {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setLoading(false);
      setError(t("wrongCredentials"));
      return;
    }

    const user = data.user;
    if (user) {
      const meta = user.user_metadata || {};
      localStorage.setItem(
        "tawsil_user",
        JSON.stringify({
          name: `${meta.first_name || ""} ${meta.last_name || ""}`.trim(),
          firstName: meta.first_name || "",
          lastName: meta.last_name || "",
          email: user.email,
          phone: meta.phone || "",
          role: "customer",
        })
      );

      // Upsert customer record
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
          }),
        });
      } catch (_) {}

      window.location.href = "/";
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {t("loginTitle")}
          </h1>
          <p className="text-slate-500 text-sm">{t("loginSubtitle")}</p>
        </div>

        {confirmed && (
          <div className="card border-emerald-200 bg-emerald-50 text-emerald-700 text-sm text-center mb-4">
            {t("emailConfirmed")}
          </div>
        )}

        <div className="card space-y-4">
          {/* Email */}
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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@gmail.com"
                className="input !pl-10"
                dir="ltr"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label !mb-0">{t("password")}</label>
              <a
                href="/forgot-password"
                className="text-xs text-blue-700 hover:underline font-medium"
              >
                {t("forgotPassword")}
              </a>
            </div>
            <div className="relative">
              <Lock
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                style={{ left: "14px" }}
              />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="btn-primary mt-2"
          >
            {loading ? t("signingIn") : t("login")}
          </button>

          <div className="mt-4 space-y-2">
            <p className="text-center text-sm text-slate-500">
              {t("noAccount")}{" "}
              <a href="/register/customer" className="text-blue-700 font-medium hover:underline">
                {t("signUp")}
              </a>
            </p>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-center text-xs text-slate-400">
                {t("areYouRider")}{" "}
                <a href="/register/rider" className="text-blue-600 font-medium hover:underline">
                  {t("registerAsRiderLink")}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
