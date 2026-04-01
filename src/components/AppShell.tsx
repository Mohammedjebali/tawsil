"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Package, Globe, LogOut, ShoppingBag, MapPin } from "lucide-react";
import { useLang } from "./LangProvider";
import type { Lang } from "@/lib/i18n";

const LANGS: { code: Lang; label: string }[] = [
  { code: "ar", label: "\u0639" },
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { lang, setLang, t, isRtl } = useLang();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tawsil_user");
    if (saved) {
      setRole(JSON.parse(saved).role);
    }
    setReady(true);
  }, []);

  // Admin pages: skip header/nav, just render children in ltr div
  if (pathname?.startsWith("/admin")) {
    return <div dir="ltr">{children}</div>;
  }

  const dir = isRtl ? "rtl" : "ltr";

  function logout() {
    localStorage.removeItem("tawsil_user");
    window.location.href = "/";
  }

  return (
    <div dir={dir} className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-9 h-9 bg-blue-700 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-base text-slate-900">Tawsil</span>
        </a>

        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  lang === l.code
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Logout */}
          {ready && role && (
            <button
              onClick={logout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
              title={t("logout")}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-lg mx-auto px-3 py-4 sm:px-4 sm:py-6 pb-24">
        {children}
      </main>

      {/* Bottom nav for customers */}
      {ready && role === "customer" && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40">
          <div className="max-w-lg mx-auto flex">
            <a
              href="/"
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors no-underline ${
                pathname === "/" ? "text-blue-700" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              {t("orderTab")}
            </a>
            <a
              href="/track"
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors no-underline ${
                pathname === "/track" ? "text-blue-700" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <MapPin className="w-5 h-5" />
              {t("trackTab")}
            </a>
          </div>
        </nav>
      )}
    </div>
  );
}
