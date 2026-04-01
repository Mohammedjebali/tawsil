import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tawsil 🛵 — توصيل منزل النور",
  description: "اطلب من أي محل وسيصلك في أسرع وقت",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "توصيل",
  },
  other: {
    "theme-color": "#f59e0b",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <header className="bg-amber-400 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛵</span>
            <div>
              <div className="font-bold text-lg text-amber-900 leading-none">توصيل</div>
              <div className="text-xs text-amber-800">منزل النور</div>
            </div>
          </div>
          <nav className="flex gap-1">
            <a href="/" className="px-3 py-1.5 rounded-lg text-sm text-amber-900 hover:bg-amber-300 transition-colors font-medium">
              اطلب
            </a>
            <a href="/track" className="px-3 py-1.5 rounded-lg text-sm text-amber-900 hover:bg-amber-300 transition-colors">
              تتبع
            </a>
            <a href="/rider" className="px-3 py-1.5 rounded-lg text-sm text-amber-900 hover:bg-amber-300 transition-colors">
              راكب
            </a>
          </nav>
        </header>
        <main className="max-w-lg mx-auto px-3 py-4 sm:px-4 sm:py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
