"use client";

import { useState, useEffect } from "react";
import { User, Phone } from "lucide-react";
import { useLang } from "@/components/LangProvider";

export default function CustomerRegister() {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("tawsil_user");
    if (saved) {
      const user = JSON.parse(saved);
      if (user.role === "customer") {
        window.location.href = "/";
      }
    }
  }, []);

  function submit() {
    if (!name.trim() || !phone.trim()) return;
    localStorage.setItem("tawsil_user", JSON.stringify({ name, phone, role: "customer" }));
    window.location.href = "/";
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-50 border-2 border-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-blue-700" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("registerAsCustomer")}</h1>
          <p className="text-slate-500 text-sm">{t("enterInfoToOrder")}</p>
        </div>

        <div className="card space-y-4">
          <div>
            <label className="label">
              {t("name")} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" style={{ left: '14px' }} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("fullName")}
                className="input !pl-10"
              />
            </div>
          </div>

          <div>
            <label className="label">
              {t("phone")} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" style={{ left: '14px' }} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="2X XXX XXX"
                className="input !pl-10"
                dir="ltr"
              />
            </div>
          </div>

          <button
            onClick={submit}
            disabled={!name.trim() || !phone.trim()}
            className="btn-primary"
          >
            {t("continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
