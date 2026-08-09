// components/language-provider.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { type Lang, translate, isRtl } from "@/lib/i18n";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };
const LanguageContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = (localStorage.getItem("orbit-lang") as Lang | null) || "en";
    applyLang(saved);
  }, []);

  function applyLang(l: Lang) {
    setLangState(l);
    document.documentElement.setAttribute("dir", isRtl(l) ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", l);
  }

  function setLang(l: Lang) {
    localStorage.setItem("orbit-lang", l);
    applyLang(l);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: (key: string) => translate(lang, key) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
