"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Package, Globe, LogOut, ShoppingBag, MapPin, ClipboardList, User, Star, TrendingUp } from "lucide-react";
import { useLang } from "./LangProvider";
import { supabaseClient } from "@/lib/supabase-client";
import type { Lang } from "@/lib/i18n";

const LANGS: { code: Lang; label: string }[] = [
  { code: "ar", label: "\u0639" },
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
];

// Pages that don't require auth
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/auth/callback", "/admin", "/rider"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { lang, setLang, t, isRtl } = useLang();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function initAuth() {
      // Check Supabase session
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (session?.user) {
        const user = session.user;
        const meta = user.user_metadata || {};
        const firstName = meta.first_name || "";
        const lastName = meta.last_name || "";

        const profile = {
          name: `${firstName} ${lastName}`.trim(),
          firstName,
          lastName,
          email: user.email,
          phone: meta.phone || "",
          role: "customer",
        };

        localStorage.setItem("tawsil_user", JSON.stringify(profile));
        setRole("customer");
        setUserName(firstName);

        // Upsert customer record
        try {
          await fetch("/api/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: user.id,
              first_name: firstName,
              last_name: lastName,
              email: user.email,
              phone: meta.phone || "",
              ...(meta.referred_by ? { referred_by: meta.referred_by } : {}),
            }),
          });
        } catch (_) {}
      } else {
        // No session — check localStorage for rider/admin
        const saved = localStorage.getItem("tawsil_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.role === "rider" || parsed.role === "admin") {
            setRole(parsed.role);
            setUserName(parsed.firstName || parsed.name || "");
          } else {
            // Customer without session — clear stale data
            localStorage.removeItem("tawsil_user");
            // Redirect to login if on a protected page
            const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));
            if (!isPublic && pathname !== "/") {
              window.location.href = "/login";
            }
          }
        } else {
          // No user at all — redirect to login for protected pages
          const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));
          if (!isPublic && pathname !== "/") {
            window.location.href = "/login";
          }
        }
      }
      setReady(true);
    }
    initAuth();
  }, [pathname]);

  // Admin pages: skip header/nav, just render children in ltr div
  if (pathname?.startsWith("/admin")) {
    return <div dir="ltr">{children}</div>;
  }

  const dir = isRtl ? "rtl" : "ltr";

  async function logout() {
    await supabaseClient.auth.signOut();
    localStorage.removeItem("tawsil_user");
    window.location.href = "/login";
  }

  return (
    <div dir={dir} className="min-h-screen" style={{ backgroundColor: "#f1f5f9" }}>
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-white/60 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-base text-indigo-600 block leading-tight">Tawsil</span>
            <span className="text-xs text-slate-400">{t("appTagline")}</span>
          </div>
        </a>

        <div className="flex items-center gap-2">
          {/* Greeting */}
          {ready && role === "customer" && userName && (
            <span className="text-sm text-slate-600 font-medium hidden sm:inline">
              {t("greeting")}, {userName}
            </span>
          )}

          {/* Language switcher */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  lang === l.code
                    ? "bg-white text-indigo-600 shadow-sm"
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

      {/* Bottom nav for riders */}
      {ready && role === "rider" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-4 px-4">
          <nav className="bg-white/90 backdrop-blur-md border border-white/60 shadow-xl rounded-2xl flex w-full max-w-lg overflow-hidden">
            <a
              href="/rider"
              className={`relative flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors no-underline ${
                pathname === "/rider" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Package className="w-5 h-5" />
              {t("orders")}
              {pathname === "/rider" && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
            </a>
            <a
              href="/rider/stats"
              className={`relative flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors no-underline ${
                pathname === "/rider/stats" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              {t("myStats")}
              {pathname === "/rider/stats" && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
            </a>
          </nav>
        </div>
      )}

      {/* Bottom nav for customers */}
      {ready && role === "customer" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-4 px-4">
          <nav className="bg-white/90 backdrop-blur-md border border-white/60 shadow-xl rounded-2xl flex w-full max-w-lg overflow-hidden">
            <a
              href="/"
              className={`relative flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors no-underline ${
                pathname === "/" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              {t("orderTab")}
              {pathname === "/" && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
            </a>
            <a
              href="/track"
              className={`relative flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors no-underline ${
                pathname === "/track" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <MapPin className="w-5 h-5" />
              {t("trackTab")}
              {pathname === "/track" && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
            </a>
            <a
              href="/orders"
              className={`relative flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors no-underline ${
                pathname === "/orders" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              {t("myOrders")}
              {pathname === "/orders" && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
            </a>
            <a
              href="/rewards"
              className={`relative flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors no-underline ${
                pathname === "/rewards" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Star className="w-5 h-5" />
              {t("rewards")}
              {pathname === "/rewards" && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
            </a>
            <a
              href="/profile"
              className={`relative flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors no-underline ${
                pathname === "/profile" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <User className="w-5 h-5" />
              {t("profile")}
              {pathname === "/profile" && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
            </a>
          </nav>
        </div>
      )}
    </div>
  );
}
