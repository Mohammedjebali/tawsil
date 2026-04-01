"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { type Lang, t as translate, getLang, setLang as saveLang } from "@/lib/i18n";

interface LangContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  isRtl: boolean;
}

const LangContext = createContext<LangContextType>({
  lang: "ar",
  setLang: () => {},
  t: (key) => key,
  isRtl: true,
});

export function useLang() {
  return useContext(LangContext);
}

export default function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLangState(getLang());
    setReady(true);
  }, []);

  const handleSetLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    saveLang(newLang);
  }, []);

  const t = useCallback((key: string) => translate(lang, key), [lang]);

  const isRtl = lang === "ar";

  if (!ready) return null;

  return (
    <LangContext.Provider value={{ lang, setLang: handleSetLang, t, isRtl }}>
      {children}
    </LangContext.Provider>
  );
}
