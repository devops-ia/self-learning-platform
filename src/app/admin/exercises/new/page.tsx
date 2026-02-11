"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/context";

interface ModuleRow {
  id: string;
  title: string;
  language: string;
}

export default function CreateExercisePage() {
  const router = useRouter();
  const { t } = useT();
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [id, setId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [title, setTitle] = useState("");
  const [briefing, setBriefing] = useState("");
  const [language, setLanguage] = useState("yaml");
  const [initialCode, setInitialCode] = useState("");
  const [hints, setHints] = useState("[]");
  const [prerequisites, setPrerequisites] = useState("[]");
  const [successMessage, setSuccessMessage] = useState("");
  const [validations, setValidations] = useState("[]");
  const [terminalCommands, setTerminalCommands] = useState("{}");
  const [sortOrder, setSortOrder] = useState(0);

  useEffect(() => {
    fetch("/api/admin/modules")
      .then((r) => r.json())
      .then((data) => {
        const mods = data.modules || [];
        setModules(mods);
        if (mods.length > 0 && !moduleId) {
          setModuleId(mods[0].id);
          setLanguage(mods[0].language);
        }
      })
      .catch(() => {});
  }, [moduleId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const body = {
        id,
        moduleId,
        title,
        briefing,
        language,
        initialCode,
        hints: JSON.parse(hints),
        prerequisites: JSON.parse(prerequisites),
        successMessage,
        validations: JSON.parse(validations),
        terminalCommands: JSON.parse(terminalCommands),
        sortOrder,
      };

      const res = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create");
        return;
      }

      router.push("/admin/exercises");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON in one of the fields");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">{t.adminPanel.createExercise}</h1>

      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 rounded bg-[var(--error)]/10 text-[var(--error)] text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
              {t.adminPanel.exerciseId}
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="tf-01-broken-provider"
              required
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
              {t.adminPanel.module}
            </label>
            <select
              value={moduleId}
              onChange={(e) => {
                setModuleId(e.target.value);
                const mod = modules.find((m) => m.id === e.target.value);
                if (mod) setLanguage(mod.language);
              }}
              required
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
            >
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
              {t.adminPanel.moduleTitle}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
                {t.adminPanel.moduleLanguage}
              </label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
                {t.adminPanel.sortOrder}
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted)]">Briefing</label>
          <textarea
            value={briefing}
            onChange={(e) => setBriefing(e.target.value)}
            required
            rows={3}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted)]">Initial Code</label>
          <textarea
            value={initialCode}
            onChange={(e) => setInitialCode(e.target.value)}
            required
            rows={10}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted)]">Success Message</label>
          <textarea
            value={successMessage}
            onChange={(e) => setSuccessMessage(e.target.value)}
            required
            rows={3}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
            Prerequisites (JSON array)
          </label>
          <textarea
            value={prerequisites}
            onChange={(e) => setPrerequisites(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
            Hints (JSON array)
          </label>
          <textarea
            value={hints}
            onChange={(e) => setHints(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
            Validations (JSON array — Check DSL)
          </label>
          <textarea
            value={validations}
            onChange={(e) => setValidations(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
            Terminal Commands (JSON object — Check DSL)
          </label>
          <textarea
            value={terminalCommands}
            onChange={(e) => setTerminalCommands(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] font-mono text-sm"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {t.adminPanel.save}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/exercises")}
            className="px-6 py-2 border border-[var(--border)] rounded hover:bg-[var(--surface-hover)] transition-colors"
          >
            {t.adminPanel.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
