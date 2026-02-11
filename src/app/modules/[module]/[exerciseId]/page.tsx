"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LabLayout from "@/components/lab/LabLayout";
import { useT } from "@/lib/i18n/context";

interface ExerciseMetadata {
  title: string;
  briefing: string;
  initialCode: string;
  language: string;
  i18n?: Record<string, { title?: string; briefing?: string }>;
}

export default function DynamicExercisePage({
  params,
}: {
  params: Promise<{ module: string; exerciseId: string }>;
}) {
  const { module, exerciseId } = use(params);
  const { lang, t } = useT();
  const router = useRouter();
  const [exercise, setExercise] = useState<ExerciseMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/exercises/${exerciseId}/metadata`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (data && !data.error) setExercise(data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [exerciseId]);

  if (loading) return null;

  if (notFound || !exercise) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-57px)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t.exercise.notFound}</h1>
          <Link href={`/modules/${module}`} className="text-[var(--accent)]">
            {t.exercise.back}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <LabLayout
      exerciseId={exerciseId}
      title={exercise.i18n?.[lang]?.title || exercise.title}
      briefing={exercise.i18n?.[lang]?.briefing || exercise.briefing}
      initialCode={exercise.initialCode}
      language={exercise.language}
      onComplete={() => {
        setTimeout(() => {
          router.push(`/modules/${module}`);
          router.refresh();
        }, 3000);
      }}
    />
  );
}
