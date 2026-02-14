"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type Theme = "dark" | "light";

const STORAGE_KEY = "devops-lab-theme";

interface ThemeContext {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeCtx = createContext<ThemeContext>({
  theme: "dark",
  toggleTheme: () => {},
});

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);
  const appliedUserPref = useRef(false);

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  // When user loads with DB preference, apply it (once)
  useEffect(() => {
    if (user?.preferences?.theme && (user.preferences.theme === "dark" || user.preferences.theme === "light") && !appliedUserPref.current) {
      appliedUserPref.current = true;
      const t = user.preferences.theme as Theme;
      setTheme(t);
      localStorage.setItem(STORAGE_KEY, t);
      applyTheme(t);
    }
    if (!user) {
      appliedUserPref.current = false;
    }
  }, [user]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      // Save to DB if logged in
      if (user) {
        fetch("/api/auth/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: next }),
        }).catch(() => {});
      }
      return next;
    });
  }, [user]);

  if (!mounted) return <>{children}</>;

  return (
    <ThemeCtx.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
