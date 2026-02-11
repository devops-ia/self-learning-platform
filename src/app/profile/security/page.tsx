"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useT } from "@/lib/i18n/context";
import TOTPSetup from "@/components/auth/TOTPSetup";
import PasskeyManager from "@/components/auth/PasskeyManager";

export default function SecurityPage() {
  const { user } = useAuth();
  const { t } = useT();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (newPassword !== confirmPassword) {
      setPwError(t.profile.passwordMismatch);
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error);
        return;
      }
      setPwSuccess(t.profile.passwordChanged);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPwError("Failed to change password");
    } finally {
      setPwLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-10">
      <h1 className="text-2xl font-bold">{t.security.title}</h1>

      {/* Password Change */}
      {user.email && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t.profile.changePassword}</h2>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            {pwError && (
              <div className="p-3 rounded bg-[var(--error)]/10 text-[var(--error)] text-sm">
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="p-3 rounded bg-[var(--success)]/10 text-[var(--success)] text-sm">
                {pwSuccess}
              </div>
            )}
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t.profile.currentPassword}
              required
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t.profile.newPassword}
              required
              minLength={8}
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.profile.confirmPassword}
              required
              minLength={8}
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={pwLoading}
              className="px-6 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {t.profile.changePassword}
            </button>
          </form>
        </section>
      )}

      {/* 2FA */}
      <section className="pt-6 border-t border-[var(--border)]">
        <TOTPSetup />
      </section>

      {/* Passkeys */}
      <section className="pt-6 border-t border-[var(--border)]">
        <PasskeyManager />
      </section>
    </div>
  );
}
