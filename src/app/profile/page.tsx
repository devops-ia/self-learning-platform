"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useT } from "@/lib/i18n/context";
import { Shield } from "lucide-react";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const { t } = useT();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setUsername(user.username || "");
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, username }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">{t.profile.title}</h1>

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
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--muted)] opacity-60"
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
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
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
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded font-medium transition-colors disabled:opacity-50"
        >
          {saving ? t.profile.saving : saved ? t.profile.saved : t.profile.save}
        </button>
      </form>

      <div className="mt-8 pt-8 border-t border-[var(--border)]">
        <Link
          href="/profile/security"
          className="flex items-center gap-2 text-[var(--accent)] hover:underline"
        >
          <Shield className="w-4 h-4" />
          {t.auth.security}
        </Link>
      </div>
    </div>
  );
}
