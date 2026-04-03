import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LangProvider from "@/components/LangProvider";
import UpdateNotifier from "@/components/UpdateNotifier";
import AppShell from "@/components/AppShell";
import InstallPrompt from "@/components/InstallPrompt";
import { AppWrapper } from "@/components/AppWrapper";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Tawsil — خدمة التوصيل السريع",
  description: "اختر من أي متجر في المنستير — مندوبنا يشتري ويوصل لك. الدفع عند الاستلام.",
  openGraph: {
    title: "Tawsil — خدمة التوصيل السريع",
    description: "اختر من أي متجر في المنستير — مندوبنا يشتري ويوصل لك. الدفع عند الاستلام.",
    url: "https://www.tawsildelivery.com",
    siteName: "Tawsil",
    type: "website",
  },
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
          <AppWrapper>
            <UpdateNotifier />
            <AppShell>{children}</AppShell>
            <InstallPrompt />
          </AppWrapper>
        </LangProvider>
      </body>
    </html>
  );
}
