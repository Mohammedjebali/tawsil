"use client";

import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, Package, Phone, Bike } from "lucide-react";
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

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{t("loginTitle")}</h1>
          <p className="text-slate-500 text-sm">{t("loginSubtitle")}</p>
        </div>

        {confirmed && (
          <div className="card border-emerald-200 bg-emerald-50 text-emerald-700 text-sm text-center mb-4">
            {t("emailConfirmed")}
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-2xl p-1 mb-4">
          <button
            onClick={() => setTab("customer")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === "customer" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"
            }`}
          >
            <Mail className="w-4 h-4" />
            {t("customer")}
          </button>
          <button
            onClick={() => setTab("rider")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === "rider" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"
            }`}
          >
            <Bike className="w-4 h-4" />
            {t("rider")}
          </button>
        </div>

        {/* Customer login */}
        {tab === "customer" && (
          <div className="card space-y-4">
            <div>
              <label className="label">{t("email")}</label>
              <div className="relative">
                <Mail className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" style={{ left: "14px" }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@gmail.com" className="input !pl-10" dir="ltr" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label !mb-0">{t("password")}</label>
                <a href="/forgot-password" className="text-xs text-blue-700 hover:underline font-medium">
                  {t("forgotPassword")}
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" style={{ left: "14px" }} />
                <input type={showPw ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" className="input !pl-10 !pr-10" dir="ltr" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  style={{ right: "14px" }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {custError && <p className="text-red-500 text-sm text-center">{custError}</p>}

            <button onClick={submitCustomer} disabled={custLoading} className="btn-primary mt-2">
              {custLoading ? t("signingIn") : t("login")}
            </button>

            <p className="text-center text-sm text-slate-500">
              {t("noAccount")}{" "}
              <a href="/register/customer" className="text-blue-700 font-medium hover:underline">
                {t("signUp")}
              </a>
            </p>
          </div>
        )}

        {/* Rider login */}
        {tab === "rider" && (
          <div className="card space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <p className="text-blue-700 text-sm font-medium">{t("riderLoginInfo")}</p>
            </div>

            <div>
              <label className="label">{t("phone")}</label>
              <div className="relative">
                <Phone className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" style={{ left: "14px" }} />
                <input type="tel" value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)}
                  placeholder="2X XXX XXX" className="input !pl-10" dir="ltr" />
              </div>
            </div>

            {riderError && <p className="text-red-500 text-sm text-center">{riderError}</p>}

            <button onClick={submitRider} disabled={riderLoading} className="btn-primary">
              {riderLoading ? t("signingIn") : t("login")}
            </button>

            <p className="text-center text-sm text-slate-500">
              {t("areYouRider")}{" "}
              <a href="/register/rider" className="text-blue-600 font-medium hover:underline">
                {t("registerAsRiderLink")}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
