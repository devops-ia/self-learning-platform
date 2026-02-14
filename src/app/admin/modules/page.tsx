"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/context";
import { Trash2, Plus, GripVertical, Pencil } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ModuleRow {
  id: string;
  title: string;
  description: Record<string, string>;
  icon: string;
  prefix: string;
  language: string;
  showDifficulty: boolean;
  sortOrder: number;
}

function SortableModuleRow({
  module: m,
  onToggleDifficulty,
  onDelete,
}: {
  module: ModuleRow;
  onToggleDifficulty: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: m.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]"
    >
      <td className="py-2 w-8">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-[var(--muted)] hover:text-[var(--foreground)]">
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="py-2 font-mono text-xs">{m.id}</td>
      <td className="py-2">{m.title}</td>
      <td className="py-2 text-[var(--muted)]">{m.prefix}</td>
      <td className="py-2 text-[var(--muted)]">{m.language}</td>
      <td className="py-2 text-[var(--muted)]">{m.icon}</td>
      <td className="py-2">
        <button
          onClick={() => onToggleDifficulty(m.id, m.showDifficulty)}
          className={`text-xs px-2 py-0.5 rounded border transition-colors ${
            m.showDifficulty
              ? "bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/30"
              : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)]"
          }`}
        >
          {m.showDifficulty ? "ON" : "OFF"}
        </button>
      </td>
      <td className="py-2 text-[var(--muted)]">{m.sortOrder}</td>
      <td className="py-2">
        <div className="flex items-center gap-1">
          <Link
            href={`/admin/modules/${m.id}`}
            className="p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <button
            onClick={() => onDelete(m.id)}
            className="p-1 text-[var(--muted)] hover:text-[var(--error)]"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  async function handleToggleDifficulty(id: string, current: boolean) {
    await fetch(`/api/admin/modules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showDifficulty: !current }),
    });
    loadModules();
  }

  async function handleDelete(id: string) {
    if (!confirm(t.adminPanel.confirmDeleteModule)) return;
    await fetch(`/api/admin/modules/${id}`, { method: "DELETE" });
    loadModules();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(modules, oldIndex, newIndex);
    setModules(reordered);

    await fetch("/api/admin/modules/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleIds: reordered.map((m) => m.id) }),
    });
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
              <th className="pb-2 w-8"></th>
              <th className="pb-2 font-medium">{t.adminPanel.moduleId}</th>
              <th className="pb-2 font-medium">{t.adminPanel.moduleTitle}</th>
              <th className="pb-2 font-medium">{t.adminPanel.modulePrefix}</th>
              <th className="pb-2 font-medium">{t.adminPanel.moduleLanguage}</th>
              <th className="pb-2 font-medium">{t.adminPanel.moduleIcon}</th>
              <th className="pb-2 font-medium">{t.difficulty?.showDifficulty || "Difficulty"}</th>
              <th className="pb-2 font-medium">{t.adminPanel.sortOrder}</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[var(--muted)]">...</td>
                  </tr>
                ) : modules.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[var(--muted)]">
                      {t.adminPanel.noResults}
                    </td>
                  </tr>
                ) : (
                  modules.map((m) => (
                    <SortableModuleRow
                      key={m.id}
                      module={m}
                      onToggleDifficulty={handleToggleDifficulty}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>
    </div>
  );
}
