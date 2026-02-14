"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/context";

interface UserData {
  id: string;
  email: string | null;
  username: string;
  displayName: string | null;
  role: string;
  createdAt: string;
  updatedAt: string | null;
  totpEnabled: boolean;
  emailVerified: boolean;
  disabled: boolean;
}

export default function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useT();
  const [user, setUser] = useState<UserData | null>(null);
  const [role, setRole] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [verifyMsg, setVerifyMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setRole(data.user.role);
          setDisplayName(data.user.displayName || "");
          setUsername(data.user.username || "");
          setDisabled(data.user.disabled || false);
        }
      });
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, displayName, username, disabled }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }
      router.push("/admin/users");
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (newPassword.length < 12) return;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    if (res.ok) {
      setPasswordMsg(t.adminPanel.passwordUpdated || "Password updated");
      setNewPassword("");
    }
  }

  async function handleResendVerification() {
    const res = await fetch(`/api/admin/users/${id}/verify-email`, { method: "POST" });
    if (res.ok) {
      setVerifyMsg(t.adminPanel.verificationSent || "Verification email sent");
    }
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center text-[var(--muted)]">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">{t.adminPanel.editUser}</h1>

      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 rounded bg-[var(--error)]/10 text-[var(--error)] text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
            {t.auth.email}
          </label>
          <input
            type="email"
            value={user.email || ""}
            disabled
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded opacity-60"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
            {t.auth.username}
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
            {t.profile.displayName}
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
            {t.adminPanel.role}
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>

        <div className="flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
          <div>
            <h3 className="font-medium">{t.adminPanel.disableUser || "Disable user"}</h3>
            <p className="text-sm text-[var(--muted)]">{t.adminPanel.accountDisabled || "Disabled users cannot log in"}</p>
          </div>
          <button
            type="button"
            onClick={() => setDisabled(!disabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${disabled ? "bg-[var(--error)]" : "bg-[var(--border)]"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${disabled ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>

        <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg space-y-3">
          <h3 className="font-medium">{t.adminPanel.resetPassword || "Reset password"}</h3>
          <div className="flex gap-2">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t.auth.newPassword || "New password"}
              minLength={12}
              className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
            />
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={newPassword.length < 12}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors text-sm disabled:opacity-50"
            >
              {t.profile.save || "Save"}
            </button>
          </div>
          {passwordMsg && <p className="text-sm text-[var(--success)]">{passwordMsg}</p>}
        </div>

        {user && !user.emailVerified && (
          <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg space-y-3">
            <h3 className="font-medium">{t.adminPanel.resendVerification || "Resend verification email"}</h3>
            <button
              type="button"
              onClick={handleResendVerification}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors text-sm"
            >
              {t.adminPanel.resendVerification || "Resend verification"}
            </button>
            {verifyMsg && <p className="text-sm text-[var(--success)]">{verifyMsg}</p>}
          </div>
        )}

        <div className="text-xs text-[var(--muted)] space-y-1">
          <p>ID: {user.id}</p>
          <p>
            {t.adminPanel.createdAt}:{" "}
            {new Date(user.createdAt).toLocaleString()}
          </p>
          <p>2FA: {user.totpEnabled ? "Enabled" : "Disabled"}</p>
          <p>Email verified: {user.emailVerified ? "Yes" : "No"}</p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {t.profile.save}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/users")}
            className="px-6 py-2 border border-[var(--border)] rounded hover:bg-[var(--surface-hover)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
