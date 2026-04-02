import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LangProvider from "@/components/LangProvider";
import UpdateNotifier from "@/components/UpdateNotifier";
import AppShell from "@/components/AppShell";
import InstallPrompt from "@/components/InstallPrompt";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Tawsil — توصيل منزل النور",
  description: "اطلب من أي محل وسيصلك في أسرع وقت",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tawsil",
  },
  icons: {
    apple: "/icon-192.png",
    icon: "/icon-512.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1e40af",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" className={inter.variable}>
      <body>
        <LangProvider>
          <UpdateNotifier />
          <AppShell>{children}</AppShell>
          <InstallPrompt />
        </LangProvider>
      </body>
    </html>
  );
}
