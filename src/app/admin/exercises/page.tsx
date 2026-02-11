"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/context";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface ExerciseRow {
  id: string;
  moduleId: string;
  title: string;
  language: string;
  sortOrder: number;
}

interface ModuleRow {
  id: string;
  title: string;
}

export default function AdminExercisesPage() {
  const { t } = useT();
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [moduleFilter, setModuleFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    try {
      const params = moduleFilter ? `?module=${moduleFilter}` : "";
      const res = await fetch(`/api/admin/exercises${params}`);
      const data = await res.json();
      setExercises(data.exercises || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [moduleFilter]);

  useEffect(() => {
    fetch("/api/admin/modules")
      .then((r) => r.json())
      .then((data) => setModules(data.modules || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  async function handleDelete(id: string) {
    if (!confirm(t.adminPanel.confirmDeleteExercise)) return;
    await fetch(`/api/admin/exercises/${id}`, { method: "DELETE" });
    loadExercises();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">{t.adminPanel.exercises}</h1>
        <Link
          href="/admin/exercises/new"
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.adminPanel.createExercise}
        </Link>
      </div>

      <div className="mb-4">
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">{t.adminPanel.allModules}</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="pb-2 font-medium">{t.adminPanel.exerciseId}</th>
              <th className="pb-2 font-medium">{t.adminPanel.module}</th>
              <th className="pb-2 font-medium">{t.adminPanel.moduleTitle}</th>
              <th className="pb-2 font-medium">{t.adminPanel.moduleLanguage}</th>
              <th className="pb-2 font-medium">{t.adminPanel.sortOrder}</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                  ...
                </td>
              </tr>
            ) : exercises.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                  {t.adminPanel.noResults}
                </td>
              </tr>
            ) : (
              exercises.map((ex) => (
                <tr
                  key={ex.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]"
                >
                  <td className="py-2 font-mono text-xs">{ex.id}</td>
                  <td className="py-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">
                      {ex.moduleId}
                    </span>
                  </td>
                  <td className="py-2">{ex.title}</td>
                  <td className="py-2 text-[var(--muted)]">{ex.language}</td>
                  <td className="py-2 text-[var(--muted)]">{ex.sortOrder}</td>
                  <td className="py-2">
                    <div className="flex gap-2 justify-end">
                      <Link
                        href={`/admin/exercises/${ex.id}`}
                        className="p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(ex.id)}
                        className="p-1 text-[var(--muted)] hover:text-[var(--error)]"
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
    </div>
  );
}
