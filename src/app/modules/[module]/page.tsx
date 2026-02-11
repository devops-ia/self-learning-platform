"use client";

import { use, useState, useEffect } from "react";
import { notFound } from "next/navigation";
import ProgressTracker from "@/components/progress/ProgressTracker";
import { Terminal, Box, Cog, Settings, Server, Cloud, Database, Shield } from "lucide-react";
import { useT } from "@/lib/i18n/context";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Terminal, Box, Cog, Settings, Server, Cloud, Database, Shield,
};

interface ModuleData {
  id: string;
  title: string;
  description: Record<string, string>;
  icon: string;
}

interface ExerciseItem {
  id: string;
  title: string;
  prerequisites: string[];
  i18n?: Record<string, { title?: string }>;
}

export default function DynamicModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = use(params);
  const { lang, t } = useT();
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

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

  if (notFoundState) notFound();
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-6 text-center text-[var(--muted)]">...</div>
    );
  }
  if (!moduleData) notFound();

  const exercisesWithStatus = exercises.map((ex, i) => ({
    ...ex,
    status: i === 0 ? ("available" as const) : ("locked" as const),
  }));

  const IconComponent = iconMap[moduleData.icon] || Terminal;

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <div className="flex items-center gap-3 mb-2">
        <IconComponent className="w-8 h-8 text-[var(--accent)]" />
        <h1 className="text-3xl font-bold">{moduleData.title}</h1>
      </div>
      <p className="text-[var(--muted)] mb-8">
        {moduleData.description[lang] || Object.values(moduleData.description)[0]}
      </p>

      <h2 className="text-lg font-semibold mb-4">{t.progress.exercises}</h2>
      <ProgressTracker module={module} exercises={exercisesWithStatus} />
    </div>
  );
}
