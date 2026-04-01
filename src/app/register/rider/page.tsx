"use client";

import { useState, useEffect } from "react";

export default function RiderRegister() {
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
          <div className="w-20 h-20 bg-red-500/15 border-2 border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">تم رفض طلبك</h1>
          <p className="text-gray-500 text-sm mb-6">للأسف، لم تتم الموافقة على طلبك. تواصل مع الإدارة لمزيد من المعلومات.</p>
          <button
            onClick={() => { localStorage.removeItem("tawsil_user"); window.location.href = "/"; }}
            className="btn-secondary"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-yellow-500/15 border-2 border-yellow-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">⏳</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">طلبك قيد المراجعة</h1>
          <p className="text-gray-500 text-sm mb-6">سيتم إخطارك عند التفعيل</p>

          <button
            onClick={checkStatus}
            disabled={checking}
            className="btn-primary mb-3"
          >
            {checking ? "جاري التحقق..." : "🔄 تحقق من الحالة"}
          </button>
          <button
            onClick={() => { localStorage.removeItem("tawsil_user"); window.location.href = "/"; }}
            className="btn-secondary"
          >
            خروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-red-500/15 border-2 border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🛵</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">تسجيل كراكب</h1>
          <p className="text-gray-500 text-sm">أدخل معلوماتك للتسجيل كراكب توصيل</p>
        </div>

        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              الاسم <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسمك الكامل"
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              رقم الهاتف <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="2X XXX XXX"
              className="input !text-left"
              dir="ltr"
            />
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
            <p className="text-yellow-400 text-xs">
              ⚠️ سيتم مراجعة طلبك من قبل الإدارة قبل التفعيل
            </p>
          </div>

          <button
            onClick={submit}
            disabled={loading || !name.trim() || !phone.trim()}
            className="btn-primary"
          >
            {loading ? "جاري التسجيل..." : "تسجيل ←"}
          </button>
        </div>
      </div>
    </div>
  );
}
