"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Package, LogOut, ShoppingBag, MapPin, ClipboardList, User, Star, TrendingUp } from "lucide-react";
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
  { href: "/app", icon: ShoppingBag, labelKey: "orderTab" },
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
            if (!isPublic && pathname !== "/" && pathname !== "/app") {
              window.location.href = "/login";
            }
          }
        } else {
          // No user at all — redirect to login for protected pages
          const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));
          if (!isPublic && pathname !== "/" && pathname !== "/app") {
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

  // Landing page: skip AppShell entirely
  if (pathname === "/") {
    return <>{children}</>;
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
        background: "#ffffff",
        borderBottom: "1px solid #E2E8F0",
        padding: "14px 16px",
        position: "sticky", top: 0, zIndex: 40,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <a href="/app" className="no-underline">
          <span style={{ fontWeight: 800, fontSize: "1.375rem", letterSpacing: "-0.04em", color: "#6366f1" }}>
            Tawsil
          </span>
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Language switcher */}
          <div style={{ display: "flex", gap: 4 }}>
            {(["ar","fr","en"] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: "4px 10px", borderRadius: 8, fontSize: "12px", fontWeight: 600,
                border: `1px solid ${lang === l ? "#6366f1" : "#E2E8F0"}`,
                background: lang === l ? "#eef2ff" : "transparent",
                color: lang === l ? "#6366f1" : "#94a3b8",
                transition: "all 0.15s", cursor: "pointer",
              }}>
                {l === "ar" ? "ع" : l === "fr" ? "FR" : "EN"}
              </button>
            ))}
          </div>

          {/* Logout */}
          {ready && role && (
            <button
              onClick={logout}
              style={{
                padding: 8, borderRadius: 8, color: "#94a3b8", background: "transparent",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center",
              }}
              title={t("logout")}
            >
              <LogOut size={16} />
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
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, padding: "0 16px 20px", display: "flex", justifyContent: "center" }}>
          <nav style={{
            width: "100%", maxWidth: "360px",
            background: "#ffffff",
            border: "1px solid #E2E8F0",
            borderRadius: "999px",
            padding: "6px 8px",
            display: "flex", alignItems: "center", justifyContent: "space-around",
            boxShadow: "0 4px 16px rgb(0 0 0 / 0.08)",
          }}>
            {riderTabs.map(tab => {
              const active = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
              return (
                <Link key={tab.href} href={tab.href}
                  onClick={() => { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(20); }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
                    padding: "8px 16px", borderRadius: "999px",
                    background: active ? "#eef2ff" : "transparent",
                    transition: "all 0.15s ease", textDecoration: "none",
                  }}>
                  <tab.icon size={19} style={{ color: active ? "#6366f1" : "#94a3b8" }} />
                  <span style={{ fontSize: "10px", fontWeight: active ? 700 : 500, color: active ? "#6366f1" : "#94a3b8" }}>
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
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, padding: "0 16px 20px", display: "flex", justifyContent: "center" }}>
          <nav style={{
            width: "100%", maxWidth: "360px",
            background: "#ffffff",
            border: "1px solid #E2E8F0",
            borderRadius: "999px",
            padding: "6px 8px",
            display: "flex", alignItems: "center", justifyContent: "space-around",
            boxShadow: "0 4px 16px rgb(0 0 0 / 0.08)",
          }}>
            {customerTabs.map(tab => {
              const active = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
              return (
                <Link key={tab.href} href={tab.href}
                  onClick={() => { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(20); }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
                    padding: "8px 16px", borderRadius: "999px",
                    background: active ? "#eef2ff" : "transparent",
                    transition: "all 0.15s ease", textDecoration: "none",
                  }}>
                  <tab.icon size={19} style={{ color: active ? "#6366f1" : "#94a3b8" }} />
                  <span style={{ fontSize: "10px", fontWeight: active ? 700 : 500, color: active ? "#6366f1" : "#94a3b8" }}>
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
