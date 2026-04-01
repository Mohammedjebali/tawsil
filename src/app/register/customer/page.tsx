"use client";

import { useState, useEffect } from "react";

export default function CustomerRegister() {
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
          <div className="w-20 h-20 bg-red-500/15 border-2 border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🛒</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">تسجيل كزبون</h1>
          <p className="text-gray-500 text-sm">أدخل معلوماتك لتبدأ الطلب</p>
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

          <button
            onClick={submit}
            disabled={!name.trim() || !phone.trim()}
            className="btn-primary"
          >
            متابعة ←
          </button>
        </div>
      </div>
    </div>
  );
}
