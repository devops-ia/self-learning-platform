"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useT, availableLanguages } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import { useAuth } from "@/components/auth/AuthProvider";
import { Sun, Moon, User, LogOut, Shield, ChevronDown } from "lucide-react";

export default function Navbar() {
  const { lang, setLang, t } = useT();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [platformTitle, setPlatformTitle] = useState("");

  useEffect(() => {
    const cached = localStorage.getItem("devops-lab-platform-title");
    if (cached) setPlatformTitle(cached);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setIsDemo(!!data.demoMode);
        const title = data.platformTitle || t.nav.home;
        setPlatformTitle(title);
        localStorage.setItem("devops-lab-platform-title", title);
      })
      .catch(() => {});
  }, [t.nav.home]);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className="border-b border-[var(--border)] px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {platformTitle || t.nav.home}
        </Link>
        {isDemo && (
          <span className="text-xs font-medium px-2 py-1 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400">
            {t.nav.demo}
          </span>
        )}
      </div>
      <div className="flex items-center gap-6 text-sm">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="bg-transparent border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--muted)] cursor-pointer hover:text-[var(--foreground)] transition-colors"
        >
          {availableLanguages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <button
          onClick={toggleTheme}
          className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {!isDemo && (
          <>
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {user.displayName || user.username}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg py-1 z-50">
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <User className="w-4 h-4" />
                      {t.auth.myAccount}
                    </Link>
                    {user.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
                      >
                        <Shield className="w-4 h-4" />
                        {t.auth.admin}
                      </Link>
                    )}
                    <hr className="my-1 border-[var(--border)]" />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--error)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      {t.auth.logout}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                {t.auth.login}
              </Link>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
