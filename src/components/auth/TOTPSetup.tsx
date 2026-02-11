"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { useT } from "@/lib/i18n/context";

export default function TOTPSetup() {
  const { user, refresh } = useAuth();
  const { t } = useT();
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  async function handleSetup() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/totp/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setQrCode(data.qrCode);
      setSecret(data.secret);
    } catch {
      setError("Failed to generate setup");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setQrCode("");
      setSecret("");
      setCode("");
      await refresh();
    } catch {
      setError("Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setShowDisable(false);
      setDisablePassword("");
      await refresh();
    } catch {
      setError("Failed to disable 2FA");
    } finally {
      setLoading(false);
    }
  }

  const isEnabled = user?.totpEnabled;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{t.security.twoFactor}</h3>
          <p className="text-sm text-[var(--muted)]">{t.security.twoFactorDesc}</p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded ${
            isEnabled
              ? "bg-[var(--success)]/10 text-[var(--success)]"
              : "bg-[var(--muted)]/10 text-[var(--muted)]"
          }`}
        >
          {isEnabled ? t.security.enabled : t.security.disabled}
        </span>
      </div>

      {error && (
        <div className="p-3 rounded bg-[var(--error)]/10 text-[var(--error)] text-sm">
          {error}
        </div>
      )}

      {!isEnabled && !qrCode && (
        <button
          onClick={handleSetup}
          disabled={loading}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
        >
          {t.security.enable2FA}
        </button>
      )}

      {qrCode && (
        <form onSubmit={handleVerify} className="space-y-4">
          <p className="text-sm">{t.security.scanQR}</p>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="TOTP QR Code" className="rounded" />
          </div>
          <p className="text-xs text-[var(--muted)] font-mono text-center break-all">
            {secret}
          </p>
          <div>
            <label className="block text-sm mb-1">{t.security.enterCode}</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-center text-lg tracking-widest focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-2 px-4 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {t.auth.verify}
          </button>
        </form>
      )}

      {isEnabled && !showDisable && (
        <button
          onClick={() => setShowDisable(true)}
          className="px-4 py-2 border border-[var(--error)] text-[var(--error)] rounded hover:bg-[var(--error)]/10 transition-colors"
        >
          {t.security.disable2FA}
        </button>
      )}

      {showDisable && (
        <form onSubmit={handleDisable} className="space-y-3">
          <input
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            placeholder={t.auth.password}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !disablePassword}
              className="px-4 py-2 bg-[var(--error)] text-white rounded hover:bg-[var(--error)]/80 transition-colors disabled:opacity-50"
            >
              {t.security.disable2FA}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDisable(false);
                setDisablePassword("");
              }}
              className="px-4 py-2 border border-[var(--border)] rounded hover:bg-[var(--surface-hover)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
