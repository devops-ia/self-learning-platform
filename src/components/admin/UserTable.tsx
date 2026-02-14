"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/context";
import { Pencil, Trash2, Plus } from "lucide-react";

interface User {
  id: string;
  email: string | null;
  username: string;
  displayName: string | null;
  role: string;
  createdAt: string;
  disabled?: boolean;
}

export default function UserTable() {
  const { t } = useT();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [createError, setCreateError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleDelete(userId: string) {
    if (!confirm(t.adminPanel.confirmDelete)) return;
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    await loadUsers();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          username: newUsername || undefined,
          role: newRole,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.error || "Failed to create user");
        return;
      }
      setShowCreate(false);
      setNewEmail("");
      setNewPassword("");
      setNewUsername("");
      setNewRole("user");
      loadUsers();
    } catch {
      setCreateError("Failed to create user");
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t.adminPanel.search}
          className="flex-1 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
        />
        <span className="text-sm text-[var(--muted)]">
          {t.adminPanel.totalUsers}: {total}
        </span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          {t.adminPanel.createUser}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg space-y-3">
          {createError && (
            <div className="p-2 rounded bg-[var(--error)]/10 text-[var(--error)] text-sm">{createError}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--muted)]">{t.auth.email}</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--muted)]">
                {t.auth.password}
                <span className="ml-1 text-[var(--muted)] font-normal">({t.adminPanel.passwordMinLength})</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={12}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--muted)]">
                {t.auth.username} <span className="font-normal text-[var(--muted)]">({t.auth.usernameOptional})</span>
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--muted)]">{t.adminPanel.role}</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "user" | "admin")}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors text-sm"
          >
            {t.adminPanel.save}
          </button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="pb-2 font-medium">{t.auth.email}</th>
              <th className="pb-2 font-medium">{t.auth.username}</th>
              <th className="pb-2 font-medium">{t.adminPanel.role}</th>
              <th className="pb-2 font-medium">{t.adminPanel.createdAt}</th>
              <th className="pb-2 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--muted)]">
                  ...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--muted)]">
                  {t.adminPanel.noResults}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]"
                >
                  <td className="py-3">{user.email || "-"}</td>
                  <td className="py-3">{user.username}</td>
                  <td className="py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        user.role === "admin"
                          ? "bg-[var(--warning)]/10 text-[var(--warning)]"
                          : user.role === "anonymous"
                          ? "bg-[var(--muted)]/10 text-[var(--muted)]"
                          : "bg-[var(--accent)]/10 text-[var(--accent)]"
                      }`}
                    >
                      {user.role}
                    </span>
                    {user.disabled && (
                      <span className="ml-1 text-xs px-2 py-0.5 rounded bg-[var(--error)]/10 text-[var(--error)]">
                        {t.adminPanel.disabled || "Disabled"}
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-[var(--muted)]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-[var(--muted)] hover:text-[var(--foreground)]"
                        title={t.adminPanel.editUser}
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-[var(--muted)] hover:text-[var(--error)]"
                        title={t.adminPanel.deleteUser}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-[var(--border)] rounded disabled:opacity-30 hover:bg-[var(--surface-hover)]"
          >
            &lt;
          </button>
          <span className="text-sm text-[var(--muted)]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border border-[var(--border)] rounded disabled:opacity-30 hover:bg-[var(--surface-hover)]"
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}
