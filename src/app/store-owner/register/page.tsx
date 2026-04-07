"use client";

import { useState, useEffect } from "react";
import { Store, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase-client";

const CATEGORIES = ["restaurant", "grocery", "pharmacy", "bakery", "cafe", "supermarket"];

export default function StoreOwnerRegisterPage() {
  const { t, isRtl } = useLang();
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  const [userId, setUserId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
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

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      }
      setCheckingAuth(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
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

  if (checkingAuth) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="animate-pulse h-8 bg-slate-100 rounded w-1/2 mx-auto" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center" dir={isRtl ? "rtl" : "ltr"}>
        <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 mb-6">Please log in first to register your store.</p>
        <Link href="/login" className="btn-primary inline-block no-underline">
          {t("login")}
        </Link>
      </div>
    );
  }

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
    <div className="max-w-lg mx-auto px-4 py-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/login" className="text-slate-500 hover:text-slate-700">
          <BackArrow size={22} />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{t("registerStore")}</h1>
      </div>

      <div className="card mb-4 flex items-center gap-3 bg-indigo-50 border-indigo-100">
        <Store className="w-8 h-8 text-indigo-600" />
        <p className="text-sm text-indigo-700">{t("registerStoreDesc")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Store name */}
        <div>
          <label className="label">{t("storeName")} <span className="text-red-500">*</span></label>
          <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        {/* Description */}
        <div>
          <label className="label">{t("storeDescription")}</label>
          <textarea className="input w-full" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {/* Category */}
        <div>
          <label className="label">{t("storeCategory")}</label>
          <select className="input w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(c)}</option>
            ))}
          </select>
        </div>

        {/* Phone */}
        <div>
          <label className="label">{t("storePhone")}</label>
          <input className="input w-full" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        {/* Address */}
        <div>
          <label className="label">{t("storeAddress")}</label>
          <input className="input w-full" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        {/* Hours */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("storeOpeningTime")}</label>
            <input className="input w-full" type="time" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("storeClosingTime")}</label>
            <input className="input w-full" type="time" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} />
          </div>
        </div>

        {/* Delivery fee */}
        <div>
          <label className="label">{t("storeDeliveryFee")}</label>
          <input
            className="input w-full"
            type="number"
            value={deliveryFee}
            onChange={(e) => setDeliveryFee(e.target.value)}
            min="0"
          />
          <p className="text-xs text-slate-400 mt-1">1500 = 1.500 {t("dt")}</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="btn-primary w-full"
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          {loading ? t("submitting") : t("submitRegistration")}
        </button>
      </form>
    </div>
  );
}
