"use client";

import { useState, useEffect, useCallback } from "react";
import { useT } from "@/lib/i18n/context";
import { Trash2, Plus } from "lucide-react";

interface ModuleRow {
  id: string;
  title: string;
  description: Record<string, string>;
  icon: string;
  prefix: string;
  language: string;
  sortOrder: number;
}

export default function AdminModulesPage() {
  const { t } = useT();
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newId, setNewId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescEs, setNewDescEs] = useState("");
  const [newDescEn, setNewDescEn] = useState("");
  const [newIcon, setNewIcon] = useState("Terminal");
  const [newPrefix, setNewPrefix] = useState("");
  const [newLanguage, setNewLanguage] = useState("yaml");
  const [error, setError] = useState("");

  const loadModules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/modules");
      const data = await res.json();
      setModules(data.modules || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/admin/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newId,
          title: newTitle,
          description: { es: newDescEs, en: newDescEn || newDescEs },
          icon: newIcon,
          prefix: newPrefix,
          language: newLanguage,
          sortOrder: modules.length,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create");
        return;
      }
      setShowCreate(false);
      setNewId("");
      setNewTitle("");
      setNewDescEs("");
      setNewDescEn("");
      setNewPrefix("");
      loadModules();
    } catch {
      setError("Failed to create module");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.adminPanel.confirmDeleteModule)) return;
    await fetch(`/api/admin/modules/${id}`, { method: "DELETE" });
    loadModules();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">{t.adminPanel.modules}</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.adminPanel.createModule}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-8 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg space-y-3">
          {error && (
            <div className="p-2 rounded bg-[var(--error)]/10 text-[var(--error)] text-sm">{error}</div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="module-id"
              required
              className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
            />
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title"
              required
              className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
            />
            <input
              type="text"
              value={newPrefix}
              onChange={(e) => setNewPrefix(e.target.value)}
              placeholder="Prefix (tf, k8s)"
              required
              className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newDescEs}
              onChange={(e) => setNewDescEs(e.target.value)}
              placeholder="Descripción (ES)"
              required
              className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
            />
            <input
              type="text"
              value={newDescEn}
              onChange={(e) => setNewDescEn(e.target.value)}
              placeholder="Description (EN)"
              className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              placeholder="Icon (Terminal, Box, Cog...)"
              className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
            />
            <input
              type="text"
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value)}
              placeholder="Language (yaml, hcl)"
              className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
            />
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
              <th className="pb-2 font-medium">{t.adminPanel.moduleId}</th>
              <th className="pb-2 font-medium">{t.adminPanel.moduleTitle}</th>
              <th className="pb-2 font-medium">{t.adminPanel.modulePrefix}</th>
              <th className="pb-2 font-medium">{t.adminPanel.moduleLanguage}</th>
              <th className="pb-2 font-medium">{t.adminPanel.moduleIcon}</th>
              <th className="pb-2 font-medium">{t.adminPanel.sortOrder}</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">...</td>
              </tr>
            ) : modules.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  {t.adminPanel.noResults}
                </td>
              </tr>
            ) : (
              modules.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]"
                >
                  <td className="py-2 font-mono text-xs">{m.id}</td>
                  <td className="py-2">{m.title}</td>
                  <td className="py-2 text-[var(--muted)]">{m.prefix}</td>
                  <td className="py-2 text-[var(--muted)]">{m.language}</td>
                  <td className="py-2 text-[var(--muted)]">{m.icon}</td>
                  <td className="py-2 text-[var(--muted)]">{m.sortOrder}</td>
                  <td className="py-2">
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-1 text-[var(--muted)] hover:text-[var(--error)]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
