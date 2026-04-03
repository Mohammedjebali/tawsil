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
  metadataBase: new URL("https://www.tawsildelivery.com"),
  title: "Tawsil — خدمة التوصيل | Tawsil Delivery",
  description: "Tawsil - خدمة توصيل سريعة في منزل النور، المنستير. اطلب من أي متجر ويصلك المندوب إلى بابك. Tawsil delivery app - fast local delivery, cash on delivery.",
  keywords: ["Tawsil", "Tawsil delivery", "توصيل", "منزل النور", "المنستير", "Monastir delivery", "Manzel Ennour", "tawsildelivery.com"],

  openGraph: {
    title: "Tawsil — خدمة التوصيل السريع",
    description: "اختر من أي متجر في المنستير — مندوبنا يشتري ويوصل لك. الدفع عند الاستلام.",
    url: "https://www.tawsildelivery.com",
    siteName: "Tawsil",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Tawsil - Fast Delivery" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tawsil — خدمة التوصيل السريع",
    description: "اختر من أي متجر في المنستير — مندوبنا يشتري ويوصل لك.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tawsil",
  },
  icons: {
    apple: "/icon-192.png",
    icon: [
      { url: "/favicon.ico", sizes: "64x64", type: "image/x-icon" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
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
