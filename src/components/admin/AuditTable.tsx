"use client";

import { useState, useEffect, useCallback } from "react";
import { useT } from "@/lib/i18n/context";

interface AuditEntry {
  id: number;
  userId: string | null;
  action: string;
  ip: string | null;
  userAgent: string | null;
  details: string | null;
  createdAt: string;
}

export default function AuditTable() {
  const { t } = useT();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (actionFilter) params.set("action", actionFilter);
      const res = await fetch(`/api/admin/audit?${params}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">All actions</option>
          <option value="login">login</option>
          <option value="login_failed">login_failed</option>
          <option value="logout">logout</option>
          <option value="register">register</option>
          <option value="password_change">password_change</option>
          <option value="totp_enable">totp_enable</option>
          <option value="totp_disable">totp_disable</option>
          <option value="passkey_register">passkey_register</option>
          <option value="admin_user_edit">admin_user_edit</option>
          <option value="admin_user_delete">admin_user_delete</option>
        </select>
        <span className="text-sm text-[var(--muted)]">
          Total: {total}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="pb-2 font-medium">{t.adminPanel.createdAt}</th>
              <th className="pb-2 font-medium">{t.adminPanel.action}</th>
              <th className="pb-2 font-medium">User ID</th>
              <th className="pb-2 font-medium">{t.adminPanel.ip}</th>
              <th className="pb-2 font-medium">{t.adminPanel.details}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--muted)]">
                  ...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--muted)]">
                  {t.adminPanel.noResults}
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]"
                >
                  <td className="py-2 text-[var(--muted)] whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">
                      {entry.action}
                    </span>
                  </td>
                  <td className="py-2 font-mono text-xs text-[var(--muted)] max-w-[120px] truncate">
                    {entry.userId || "-"}
                  </td>
                  <td className="py-2 text-[var(--muted)]">
                    {entry.ip || "-"}
                  </td>
                  <td className="py-2 text-[var(--muted)] max-w-[200px] truncate">
                    {entry.details || "-"}
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
