"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import LoginForm from "@/components/auth/LoginForm";
import OAuthButtons from "@/components/auth/OAuthButtons";
import PasskeyButton from "@/components/auth/PasskeyButton";
import { useT } from "@/lib/i18n/context";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const { t } = useT();
  const [oauthProviders, setOauthProviders] = useState<string[]>([]);
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [totpError, setTotpError] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.oauthProviders) setOauthProviders(data.oauthProviders);
      })
      .catch(() => {});
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      window.location.href = "/";
    }
  }, [user, loading]);

  async function handle2FA(e: React.FormEvent) {
    e.preventDefault();
    setTotpError("");
    setTotpLoading(true);
    try {
      const res = await fetch("/api/auth/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode, isLogin: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTotpError(data.error || t.auth.invalidCode);
        return;
      }
      window.location.href = "/";
    } catch {
      setTotpError(t.auth.loginError);
    } finally {
      setTotpLoading(false);
    }
  }

  if (loading) return null;
  if (user) return null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t.auth.login}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {t.auth.loginSubtitle}
          </p>
        </div>

        {requires2FA ? (
          <form onSubmit={handle2FA} className="space-y-4">
            <p className="text-sm text-[var(--muted)]">{t.auth.enter2FA}</p>
            {totpError && (
              <div className="p-3 rounded bg-[var(--error)]/10 text-[var(--error)] text-sm">
                {totpError}
              </div>
            )}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="000000"
              autoFocus
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--foreground)] text-center text-lg tracking-widest focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={totpLoading || totpCode.length !== 6}
              className="w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded font-medium transition-colors disabled:opacity-50"
            >
              {totpLoading ? t.auth.verifying : t.auth.verify}
            </button>
          </form>
        ) : (
          <>
            <LoginForm onRequires2FA={() => setRequires2FA(true)} />

            <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
              <div className="flex-1 h-px bg-[var(--border)]" />
              {t.auth.or}
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            <PasskeyButton />

            {oauthProviders.length > 0 && (
              <OAuthButtons providers={oauthProviders} />
            )}
          </>
        )}

        <p className="text-center text-sm text-[var(--muted)]">
          {t.auth.noAccount}{" "}
          <Link href="/register" className="text-[var(--accent)] hover:underline">
            {t.auth.register}
          </Link>
        </p>
      </div>
    </div>
  );
}
