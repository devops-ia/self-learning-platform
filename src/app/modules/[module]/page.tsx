"use client";

import { use, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import ProgressTracker from "@/components/progress/ProgressTracker";
import { Terminal, Box, Cog, Settings, Server, Cloud, Database, Shield, List, GitBranch } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";

const ExerciseGraph = dynamic(() => import("@/components/progress/ExerciseGraph"), {
  ssr: false,
  loading: () => <div className="h-[500px] border border-[var(--border)] rounded-lg flex items-center justify-center text-[var(--muted)]">...</div>,
});

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Terminal, Box, Cog, Settings, Server, Cloud, Database, Shield,
};

interface ModuleData {
  id: string;
  title: string;
  description: Record<string, string>;
  icon: string;
  showDifficulty?: boolean;
}

interface ExerciseItem {
  id: string;
  title: string;
  prerequisites: string[];
  difficulty?: string;
  i18n?: Record<string, { title?: string }>;
}

export default function DynamicModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = use(params);
  const { lang, t } = useT();
  const { loading: authLoading } = useRequireAuth();
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "graph">(() => {
    if (typeof window === "undefined") return "list";
    return (localStorage.getItem("devops-lab-view-mode") as "list" | "graph") || "list";
  });

  useEffect(() => {
    fetch(`/api/modules/${module}/exercises`)
      .then((r) => {
        if (!r.ok) { setNotFoundState(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setModuleData(data.module);
          setExercises(data.exercises || []);
        }
      })
      .catch(() => setNotFoundState(true))
      .finally(() => setLoading(false));
  }, [module]);

  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-6 text-center text-[var(--muted)]">...</div>
    );
  }
  if (notFoundState) notFound();
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-6 text-center text-[var(--muted)]">...</div>
    );
  }
  if (!moduleData) notFound();

  const IconComponent = iconMap[moduleData.icon] || Terminal;

  function toggleView(mode: "list" | "graph") {
    setViewMode(mode);
    localStorage.setItem("devops-lab-view-mode", mode);
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <div className="flex items-center gap-3 mb-2">
        <IconComponent className="w-8 h-8 text-[var(--accent)]" />
        <h1 className="text-3xl font-bold">{moduleData.title}</h1>
      </div>
      <p className="text-[var(--muted)] mb-8">
        {moduleData.description[lang] || Object.values(moduleData.description)[0]}
      </p>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t.progress.exercises}</h2>
        <div className="flex border border-[var(--border)] rounded-lg overflow-hidden">
          <button
            onClick={() => toggleView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
              viewMode === "list"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:bg-[var(--surface-hover)]"
            }`}
            title={t.progress.listView || "List view"}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleView("graph")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
              viewMode === "graph"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:bg-[var(--surface-hover)]"
            }`}
            title={t.progress.graphView || "Graph view"}
          >
            <GitBranch className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <ProgressTracker module={module} exercises={exercises} showDifficulty={moduleData.showDifficulty} />
      ) : (
        <ExerciseGraph module={module} exercises={exercises} showDifficulty={moduleData.showDifficulty} />
      )}
    </div>
  );
}
