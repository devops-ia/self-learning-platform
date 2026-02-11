"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { es } from "./locales/es";
import { en } from "./locales/en";

type Translations = typeof es;
type Lang = string;

const locales: Record<string, Translations> = { es, en };
const STORAGE_KEY = "devops-lab-lang";
const DEFAULT_LANG = "es";

export const availableLanguages: { code: string; label: string }[] = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
];

interface I18nContext {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
}

const I18nCtx = createContext<I18nContext>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: es,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && locales[stored]) {
      setLangState(stored);
    }
    setMounted(true);
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    if (locales[newLang]) {
      setLangState(newLang);
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = lang;
    }
  }, [lang, mounted]);

  const t = locales[lang] || es;

  return (
    <I18nCtx.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nCtx.Provider>
  );
}

export function useT() {
  return useContext(I18nCtx);
}
