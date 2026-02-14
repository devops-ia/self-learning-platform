"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
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
  const { user } = useAuth();
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [mounted, setMounted] = useState(false);
  const appliedUserPref = useRef(false);

  // On mount: read from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && locales[stored]) {
      setLangState(stored);
    }
    setMounted(true);
  }, []);

  // When user loads with DB preference, apply it (once)
  useEffect(() => {
    if (user?.preferences?.language && locales[user.preferences.language] && !appliedUserPref.current) {
      appliedUserPref.current = true;
      setLangState(user.preferences.language);
      localStorage.setItem(STORAGE_KEY, user.preferences.language);
      document.documentElement.lang = user.preferences.language;
    }
    if (!user) {
      appliedUserPref.current = false;
    }
  }, [user]);

  const setLang = useCallback((newLang: Lang) => {
    if (locales[newLang]) {
      setLangState(newLang);
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
      // Save to DB if logged in (fire and forget)
      if (user) {
        fetch("/api/auth/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: newLang }),
        }).catch(() => {});
      }
    }
  }, [user]);

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
