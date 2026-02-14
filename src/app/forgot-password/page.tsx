"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/lib/i18n/context";

export default function ForgotPasswordPage() {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "An error occurred");
        return;
      }

      setSuccess(true);
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t.auth.forgotPassword}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Ingresa tu email para recibir un enlace de restablecimiento
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="p-4 rounded bg-green-500/10 text-green-600 dark:text-green-400 text-sm">
              {t.auth.resetSent}
            </div>
            <Link
              href="/login"
              className="block text-center text-sm text-[var(--accent)] hover:underline"
            >
              {t.auth.login}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded bg-[var(--error)]/10 text-[var(--error)] text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-[var(--accent)] hover:underline"
            >
              {t.auth.login}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
