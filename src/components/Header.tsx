"use client";

import { useState, useEffect } from "react";

export default function Header() {
  const [role, setRole] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tawsil_user");
    if (saved) {
      const user = JSON.parse(saved);
      setRole(user.role);
    }
    setReady(true);
  }, []);

  function logout() {
    localStorage.removeItem("tawsil_user");
    window.location.href = "/";
  }

  if (!ready) return (
    <header className="bg-[#0d1117]/95 backdrop-blur-sm border-b border-[#1e2535] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-lg">🛵</div>
        <div>
          <div className="font-bold text-base text-white leading-none">Tawsil</div>
          <div className="text-[10px] text-gray-500">منزل النور</div>
        </div>
      </div>
    </header>
  );

  return (
    <header className="bg-[#0d1117]/95 backdrop-blur-sm border-b border-[#1e2535] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-2.5">
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-lg">🛵</div>
          <div>
            <div className="font-bold text-base text-white leading-none">Tawsil</div>
            <div className="text-[10px] text-gray-500">منزل النور</div>
          </div>
        </a>
      </div>
      <nav className="flex gap-1 items-center">
        {role === "customer" && (
          <>
            <a href="/" className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1e2535] transition-all font-medium">
              اطلب
            </a>
            <a href="/track" className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1e2535] transition-all">
              تتبع
            </a>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
            >
              خروج
            </button>
          </>
        )}
        {role === "rider" && (
          <>
            <a href="/rider" className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1e2535] transition-all font-medium">
              طلباتي
            </a>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
            >
              خروج
            </button>
          </>
        )}
        {!role && (
          <>
            <a href="/" className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1e2535] transition-all font-medium">
              الرئيسية
            </a>
          </>
        )}
      </nav>
    </header>
  );
}
