"use client";

import { useState, useEffect } from "react";
import { Bike, User, Phone, Clock, XCircle, RefreshCw } from "lucide-react";
import { useLang } from "@/components/LangProvider";

export default function RiderRegister() {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"form" | "pending" | "rejected">("form");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tawsil_user");
    if (saved) {
      const user = JSON.parse(saved);
      if (user.role === "rider") {
        if (user.status === "active") {
          window.location.href = "/rider";
          return;
        }
        if (user.status === "pending") {
          setName(user.name);
          setPhone(user.phone);
          setStatus("pending");
        }
        if (user.status === "rejected") {
          setStatus("rejected");
        }
      }
    }
  }, []);

  async function submit() {
    if (!name.trim() || !phone.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/riders/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const rider = data.rider;
      localStorage.setItem("tawsil_user", JSON.stringify({
        name: rider.name,
        phone: rider.phone,
        role: "rider",
        status: rider.status,
        rider_id: rider.id,
      }));

      if (rider.status === "active") {
        window.location.href = "/rider";
      } else if (rider.status === "rejected") {
        setStatus("rejected");
      } else {
        setStatus("pending");
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus() {
    setChecking(true);
    try {
      const res = await fetch(`/api/riders/status?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (data.status === "active") {
        const saved = localStorage.getItem("tawsil_user");
        if (saved) {
          const user = JSON.parse(saved);
          user.status = "active";
          localStorage.setItem("tawsil_user", JSON.stringify(user));
        }
        window.location.href = "/rider";
      } else if (data.status === "rejected") {
        setStatus("rejected");
        const saved = localStorage.getItem("tawsil_user");
        if (saved) {
          const user = JSON.parse(saved);
          user.status = "rejected";
          localStorage.setItem("tawsil_user", JSON.stringify(user));
        }
      }
    } finally {
      setChecking(false);
    }
  }

  if (status === "rejected") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-red-50 border-2 border-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("rejected")}</h1>
          <p className="text-slate-500 text-sm mb-6">{t("rejectedDesc")}</p>
          <button
            onClick={() => { localStorage.removeItem("tawsil_user"); window.location.href = "/"; }}
            className="btn-secondary"
          >
            {t("backToHome")}
          </button>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("pendingApproval")}</h1>
          <p className="text-slate-500 text-sm mb-6">{t("pendingDesc")}</p>

          <button
            onClick={checkStatus}
            disabled={checking}
            className="btn-primary mb-3"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? t("checking") : t("checkStatus")}
          </button>
          <button
            onClick={() => { localStorage.removeItem("tawsil_user"); window.location.href = "/"; }}
            className="btn-secondary"
          >
            {t("logout")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-50 border-2 border-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bike className="w-10 h-10 text-blue-700" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("registerAsRider")}</h1>
          <p className="text-slate-500 text-sm">{t("enterInfoToDeliver")}</p>
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

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-amber-700 text-xs font-medium">
              {t("reviewWarning")}
            </p>
          </div>

          <button
            onClick={submit}
            disabled={loading || !name.trim() || !phone.trim()}
            className="btn-primary"
          >
            {loading ? t("registering") : t("register")}
          </button>
        </div>
      </div>
    </div>
  );
}
