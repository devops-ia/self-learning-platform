"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { useT } from "@/lib/i18n/context";

export default function LoginForm({
  onRequires2FA,
}: {
  onRequires2FA?: () => void;
}) {
  const { refresh } = useAuth();
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t.auth.loginError);
        return;
      }

      if (data.requires2FA) {
        onRequires2FA?.();
        return;
      }

      await refresh();
      window.location.href = "/";
    } catch {
      setError(t.auth.loginError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded bg-[var(--error)]/10 text-[var(--error)] text-sm">
          {error}
        </div>
      )}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium mb-1 text-[var(--muted)]"
        >
          {t.auth.email}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium mb-1 text-[var(--muted)]"
        >
          {t.auth.password}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded font-medium transition-colors disabled:opacity-50"
      >
        {loading ? t.auth.loggingIn : t.auth.login}
      </button>
    </form>
  );
}
