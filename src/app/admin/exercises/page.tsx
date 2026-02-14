"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/context";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

function SortableRow({
  exercise,
  onDelete,
}: {
  exercise: ExerciseRow;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]"
    >
      <td className="py-2 w-8">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="py-2 font-mono text-xs">{exercise.id}</td>
      <td className="py-2">
        <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">
          {exercise.moduleId}
        </span>
      </td>
      <td className="py-2">{exercise.title}</td>
      <td className="py-2 text-[var(--muted)]">{exercise.language}</td>
      <td className="py-2 text-[var(--muted)]">{exercise.sortOrder}</td>
      <td className="py-2">
        <div className="flex gap-2 justify-end">
          <Link
            href={`/admin/exercises/${exercise.id}`}
            className="p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <button
            onClick={() => onDelete(exercise.id)}
            className="p-1 text-[var(--muted)] hover:text-[var(--error)]"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminExercisesPage() {
  const { t } = useT();
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [moduleFilter, setModuleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadExercises = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (moduleFilter) params.set("module", moduleFilter);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`/api/admin/exercises?${params.toString()}`);
      const data = await res.json();
      setExercises(data.exercises || []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [moduleFilter, page]);

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = exercises.findIndex((e) => e.id === active.id);
    const newIndex = exercises.findIndex((e) => e.id === over.id);
    const reordered = arrayMove(exercises, oldIndex, newIndex);
    setExercises(reordered);

    // Determine module for the reordered exercises
    const moduleId = exercises[oldIndex]?.moduleId;
    if (!moduleId) return;

    // Only send IDs for exercises in the same module
    const moduleExerciseIds = reordered
      .filter((e) => e.moduleId === moduleId)
      .map((e) => e.id);

    await fetch("/api/admin/exercises/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, exerciseIds: moduleExerciseIds }),
    });

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
          onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                <th className="pb-2 w-8"></th>
                <th className="pb-2 font-medium">{t.adminPanel.exerciseId}</th>
                <th className="pb-2 font-medium">{t.adminPanel.module}</th>
                <th className="pb-2 font-medium">{t.adminPanel.moduleTitle}</th>
                <th className="pb-2 font-medium">{t.adminPanel.moduleLanguage}</th>
                <th className="pb-2 font-medium">{t.adminPanel.sortOrder}</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <SortableContext
              items={exercises.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                      ...
                    </td>
                  </tr>
                ) : exercises.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                      {t.adminPanel.noResults}
                    </td>
                  </tr>
                ) : (
                  exercises.map((ex) => (
                    <SortableRow
                      key={ex.id}
                      exercise={ex}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-[var(--muted)]">
            {t.adminPanel.total}: {total}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 border border-[var(--border)] rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-hover)] transition-colors"
            >
              {t.adminPanel.previous}
            </button>
            <span>
              {t.adminPanel.page} {page} {t.adminPanel.of} {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 border border-[var(--border)] rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-hover)] transition-colors"
            >
              {t.adminPanel.next}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
