import type { Metadata, Viewport } from "next";
import "./globals.css";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata: Metadata = {
  title: "Tawsil — توصيل منزل النور",
  description: "اطلب من أي محل وسيصلك في أسرع وقت",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tawsil",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0d1117",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-[#0d1117]">
        {/* Header */}
        <header className="bg-[#0d1117]/95 backdrop-blur-sm border-b border-[#1e2535] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-lg">
              🛵
            </div>
            <div>
              <div className="font-bold text-base text-white leading-none">Tawsil</div>
              <div className="text-[10px] text-gray-500">منزل النور</div>
            </div>
          </div>
          <nav className="flex gap-1">
            <a href="/" className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1e2535] transition-all font-medium">
              اطلب
            </a>
            <a href="/track" className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1e2535] transition-all">
              تتبع
            </a>
            <a href="/rider" className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1e2535] transition-all">
              راكب
            </a>
          </nav>
        </header>
        <main className="max-w-lg mx-auto px-3 py-4 sm:px-4 sm:py-6">
          {children}
        </main>
        <InstallPrompt />
      </body>
    </html>
  );
}
