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
        body: JSON.stringify({ role, displayName, username }),
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
