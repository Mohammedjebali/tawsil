import type { Metadata, Viewport } from "next";
import "./globals.css";
import InstallPrompt from "@/components/InstallPrompt";
import Header from "@/components/Header";

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
        <Header />
        <main className="max-w-lg mx-auto px-3 py-4 sm:px-4 sm:py-6">
          {children}
        </main>
        <InstallPrompt />
      </body>
    </html>
  );
}
