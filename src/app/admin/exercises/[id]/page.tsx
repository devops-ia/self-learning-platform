"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/context";

interface ModuleRow {
  id: string;
  title: string;
}

export default function EditExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useT();
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [moduleId, setModuleId] = useState("");
  const [title, setTitle] = useState("");
  const [briefing, setBriefing] = useState("");
  const [language, setLanguage] = useState("");
  const [initialCode, setInitialCode] = useState("");
  const [hints, setHints] = useState("[]");
  const [prerequisites, setPrerequisites] = useState("[]");
  const [successMessage, setSuccessMessage] = useState("");
  const [validations, setValidations] = useState("[]");
  const [terminalCommands, setTerminalCommands] = useState("{}");
  const [difficulty, setDifficulty] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [moduleExercises, setModuleExercises] = useState<{id: string; title: string}[]>([]);

  useEffect(() => {
    fetch("/api/admin/modules")
      .then((r) => r.json())
      .then((data) => setModules(data.modules || []))
      .catch(() => {});

    fetch(`/api/admin/exercises/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setModuleId(data.moduleId || "");
        setTitle(data.title || "");
        setBriefing(data.briefing || "");
        setLanguage(data.language || "");
        setInitialCode(data.initialCode || "");
        setHints(JSON.stringify(data.hints || [], null, 2));
        setPrerequisites(JSON.stringify(data.prerequisites || [], null, 2));
        setSuccessMessage(data.successMessage || "");
        setValidations(JSON.stringify(data.validations || [], null, 2));
        setTerminalCommands(JSON.stringify(data.terminalCommands || {}, null, 2));
        setDifficulty(data.difficulty || "");
        setSortOrder(data.sortOrder || 0);
        setLoaded(true);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!moduleId) return;
    fetch(`/api/admin/exercises?module=${moduleId}`)
      .then(r => r.json())
      .then(data => {
        setModuleExercises(
          (data.exercises || [])
            .filter((e: {id: string; title: string}) => e.id !== id)
            .map((e: {id: string; title: string}) => ({ id: e.id, title: e.title }))
        );
      })
      .catch(() => {});
  }, [moduleId, id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const body = {
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
        difficulty: difficulty || null,
        sortOrder,
      };

      const res = await fetch(`/api/admin/exercises/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      router.push("/admin/exercises");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON in one of the fields");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-[var(--muted)]">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">{t.adminPanel.editExercise}</h1>
      <p className="text-sm text-[var(--muted)] mb-8 font-mono">{id}</p>

      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 rounded bg-[var(--error)]/10 text-[var(--error)] text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
              {t.adminPanel.module}
            </label>
            <select
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
            >
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
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
          <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
            {t.difficulty?.none || "Difficulty"}
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="">{t.difficulty?.none || "No difficulty"}</option>
            <option value="easy">{t.difficulty?.easy || "Easy"}</option>
            <option value="medium">{t.difficulty?.medium || "Medium"}</option>
            <option value="hard">{t.difficulty?.hard || "Hard"}</option>
          </select>
        </div>

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
            Prerequisites
          </label>
          <div className="border border-[var(--border)] rounded p-3 max-h-48 overflow-y-auto space-y-2 bg-[var(--surface)]">
            {moduleExercises.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No other exercises in this module</p>
            ) : (
              moduleExercises.map((ex) => {
                const prereqs: string[] = (() => { try { return JSON.parse(prerequisites); } catch { return []; } })();
                const checked = prereqs.includes(ex.id);
                return (
                  <label key={ex.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--surface-hover)] rounded p-1">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const current: string[] = (() => { try { return JSON.parse(prerequisites); } catch { return []; } })();
                        const updated = checked
                          ? current.filter(p => p !== ex.id)
                          : [...current, ex.id];
                        setPrerequisites(JSON.stringify(updated));
                      }}
                      className="rounded"
                    />
                    <span className="font-mono text-xs text-[var(--muted)]">{ex.id}</span>
                    <span>{ex.title}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
            Hints (JSON)
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
            Validations (JSON — Check DSL)
          </label>
          <textarea
            value={validations}
            onChange={(e) => setValidations(e.target.value)}
            rows={12}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted)]">
            Terminal Commands (JSON — Check DSL)
          </label>
          <textarea
            value={terminalCommands}
            onChange={(e) => setTerminalCommands(e.target.value)}
            rows={12}
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
