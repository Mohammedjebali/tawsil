"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { useLang } from "./LangProvider";

export default function InstallPrompt() {
  const { t } = useLang();
  const [prompt, setPrompt] = useState<Event & { prompt?: () => void } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
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
    if (prompt && typeof (prompt as unknown as { prompt: () => void }).prompt === "function") {
      (prompt as unknown as { prompt: () => void }).prompt();
      setVisible(false);
    }
  };

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 max-w-lg mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900 text-sm">{t("installApp")}</div>
          <div className="text-xs text-slate-500">{t("installDesc")}</div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={install}
            className="bg-blue-700 text-white text-xs px-3.5 py-2 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
          >
            {t("install")}
          </button>
          <button
            onClick={() => setVisible(false)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
