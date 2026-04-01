"use client";

import { useState, useEffect } from "react";

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<Event & { prompt?: () => void } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as Event & { prompt?: () => void });
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !prompt) return null;

  const install = async () => {
    if (prompt && typeof (prompt as any).prompt === "function") {
      (prompt as any).prompt();
      setVisible(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-3 right-3 z-50 max-w-lg mx-auto">
      <div className="bg-[#1a1f2e] border border-red-500/30 rounded-xl shadow-lg p-3 flex items-center gap-3">
        <span className="text-2xl">🛵</span>
        <div className="flex-1">
          <div className="font-bold text-white text-sm">ثبّت التطبيق</div>
          <div className="text-xs text-gray-400">وصول سريع من شاشتك الرئيسية</div>
        </div>
        <div className="flex gap-2">
          <button onClick={install} className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-red-600 transition-colors">
            تثبيت
          </button>
          <button onClick={() => setVisible(false)} className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1.5 transition-colors">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
