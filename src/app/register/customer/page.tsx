"use client";

import { useState, useEffect } from "react";
import { User, Phone, Mail, ArrowLeft } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import Link from "next/link";

export default function CustomerRegister() {
  const { t, isRtl } = useLang();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+216");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = localStorage.getItem("tawsil_user");
    if (saved) {
      const user = JSON.parse(saved);
      if (user.role === "customer") window.location.href = "/";
    }
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = t("required");
    if (!lastName.trim()) e.lastName = t("required");
    if (!email.trim() || !email.toLowerCase().endsWith("@gmail.com")) e.email = "Gmail requis (ex: nom@gmail.com)";
    if (!phone.trim() || phone.length < 12) e.phone = t("invalidPhone");
    return e;
  }

  async function submit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    // Save to Supabase
    try {
      await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, email, phone }),
      });
    } catch (_) {}

    localStorage.setItem("tawsil_user", JSON.stringify({
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email,
      phone,
      role: "customer",
    }));
    window.location.href = "/";
  }

  const BackIcon = isRtl ? ArrowLeft : ArrowLeft;

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-6 transition-colors">
          <ArrowLeft size={16} />
          {t("back")}
        </Link>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 border-2 border-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-blue-700" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{t("iAmCustomer")}</h1>
          <p className="text-slate-500 text-sm">{t("customerDesc")}</p>
        </div>

        <div className="card space-y-4">
          {/* First name + Last name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setErrors(prev => ({ ...prev, firstName: "" })); }}
                placeholder="Mohamed"
                className={`input ${errors.firstName ? "border-red-400 focus:border-red-400" : ""}`}
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="label">Nom *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); setErrors(prev => ({ ...prev, lastName: "" })); }}
                placeholder="Ben Ali"
                className={`input ${errors.lastName ? "border-red-400 focus:border-red-400" : ""}`}
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="label">Email *</label>
            <div className="relative">
              <Mail className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" style={{ left: "14px" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: "" })); }}
                placeholder="nom@gmail.com"
                className={`input !pl-10 ${errors.email ? "border-red-400 focus:border-red-400" : ""}`}
                dir="ltr"
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="label">{t("phone")} *</label>
            <div className="relative">
              <Phone className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" style={{ left: "14px" }} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  let v = e.target.value;
                  if (!v.startsWith("+216")) v = "+216" + v.replace(/^\+216/, "");
                  setPhone(v);
                  setErrors(prev => ({ ...prev, phone: "" }));
                }}
                placeholder="+216 XX XXX XXX"
                className={`input !pl-10 ${errors.phone ? "border-red-400 focus:border-red-400" : ""}`}
                dir="ltr"
                maxLength={13}
              />
            </div>
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          <button
            onClick={submit}
            className="btn-primary mt-2"
          >
            {t("continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
