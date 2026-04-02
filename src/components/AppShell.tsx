"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
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

const customerTabs = [
  { href: "/", icon: ShoppingBag, labelKey: "orderTab" },
  { href: "/track", icon: MapPin, labelKey: "trackTab" },
  { href: "/orders", icon: ClipboardList, labelKey: "myOrders" },
  { href: "/rewards", icon: Star, labelKey: "rewards" },
  { href: "/profile", icon: User, labelKey: "profile" },
];

const riderTabs = [
  { href: "/rider", icon: Package, labelKey: "orders" },
  { href: "/rider/stats", icon: TrendingUp, labelKey: "myStats" },
];

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
    <div dir={dir} className="min-h-screen">
      {/* Header */}
      <header style={{
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(20px) saturate(200%)",
        WebkitBackdropFilter: "blur(20px) saturate(200%)",
        borderBottom: "1px solid rgba(203,213,225,0.3)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04)",
        padding: "12px 16px",
        position: "sticky", top: 0, zIndex: 40,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <span style={{
              fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.04em",
              background: "linear-gradient(135deg, #6366f1, #4338ca)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>Tawsil</span>
            <span className="text-xs text-slate-400 block">{t("appTagline")}</span>
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
      <main className="max-w-lg mx-auto px-3 py-4 sm:px-4 sm:py-6 pb-28">
        {children}
      </main>

      {/* Bottom nav for riders */}
      {ready && role === "rider" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 pb-5 px-5 flex justify-center" style={{ pointerEvents: "none" }}>
          <nav style={{
            pointerEvents: "auto",
            width: "100%",
            maxWidth: "360px",
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(20px) saturate(200%)",
            WebkitBackdropFilter: "blur(20px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: "0 8px 32px rgba(99,102,241,0.15), 0 2px 8px rgba(0,0,0,0.06)",
            borderRadius: "999px",
            padding: "6px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
          }}>
            {riderTabs.map(tab => {
              const active = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
              return (
                <Link key={tab.href} href={tab.href}
                  onClick={() => { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30); }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
                    padding: "8px 14px", borderRadius: "999px", transition: "all 0.2s ease",
                    background: active ? "rgba(99,102,241,0.1)" : "transparent",
                    transform: active ? "scale(1.08)" : "scale(1)",
                    boxShadow: active ? "0 0 12px rgba(99,102,241,0.2)" : "none",
                    textDecoration: "none",
                  }}>
                  <tab.icon size={20} style={{ color: active ? "#6366f1" : "#94a3b8", transition: "color 0.2s" }} />
                  <span style={{ fontSize: "10px", fontWeight: active ? 700 : 500, color: active ? "#6366f1" : "#94a3b8", transition: "color 0.2s" }}>
                    {t(tab.labelKey)}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Bottom nav for customers */}
      {ready && role === "customer" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 pb-5 px-5 flex justify-center" style={{ pointerEvents: "none" }}>
          <nav style={{
            pointerEvents: "auto",
            width: "100%",
            maxWidth: "360px",
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(20px) saturate(200%)",
            WebkitBackdropFilter: "blur(20px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: "0 8px 32px rgba(99,102,241,0.15), 0 2px 8px rgba(0,0,0,0.06)",
            borderRadius: "999px",
            padding: "6px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
          }}>
            {customerTabs.map(tab => {
              const active = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
              return (
                <Link key={tab.href} href={tab.href}
                  onClick={() => { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30); }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
                    padding: "8px 14px", borderRadius: "999px", transition: "all 0.2s ease",
                    background: active ? "rgba(99,102,241,0.1)" : "transparent",
                    transform: active ? "scale(1.08)" : "scale(1)",
                    boxShadow: active ? "0 0 12px rgba(99,102,241,0.2)" : "none",
                    textDecoration: "none",
                  }}>
                  <tab.icon size={20} style={{ color: active ? "#6366f1" : "#94a3b8", transition: "color 0.2s" }} />
                  <span style={{ fontSize: "10px", fontWeight: active ? 700 : 500, color: active ? "#6366f1" : "#94a3b8", transition: "color 0.2s" }}>
                    {t(tab.labelKey)}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
