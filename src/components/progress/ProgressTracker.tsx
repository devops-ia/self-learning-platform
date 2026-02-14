"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, Lock, Circle } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { useAuth } from "@/components/auth/AuthProvider";

interface ExerciseItem {
  id: string;
  title: string;
  prerequisites: string[];
  difficulty?: string;
}

interface ProgressTrackerProps {
  module: string;
  exercises: ExerciseItem[];
  showDifficulty?: boolean;
}

const difficultyColors: Record<string, string> = {
  easy: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  hard: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function ProgressTracker({
  module,
  exercises,
  showDifficulty,
}: ProgressTrackerProps) {
  const { t } = useT();
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    // Compute default statuses from prerequisites:
    // exercises with no prerequisites are available, others are locked
    function defaultStatuses(): Record<string, string> {
      const map: Record<string, string> = {};
      exercises.forEach((ex) => {
        map[ex.id] = ex.prerequisites.length === 0 ? "available" : "locked";
      });
      return map;
    }

    if (!user?.id) {
      setStatuses(defaultStatuses());
      return;
    }

    fetch(`/api/progress?module=${module}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.progress && Object.keys(data.progress).length > 0) {
          setStatuses(data.progress);
        } else {
          setStatuses(defaultStatuses());
        }
      })
      .catch(() => {
        setStatuses(defaultStatuses());
      });
  }, [module, exercises, user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-[var(--success)]" />;
      case "locked":
        return <Lock className="w-5 h-5 text-[var(--muted)]" />;
      default:
        return <Circle className="w-5 h-5 text-[var(--accent)]" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return t.progress.completed;
      case "locked":
        return t.progress.locked;
      default:
        return t.progress.available;
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = {
      easy: t.difficulty?.easy || "Easy",
      medium: t.difficulty?.medium || "Medium",
      hard: t.difficulty?.hard || "Hard",
    };
    return labels[difficulty] || difficulty;
  };

  function DifficultyBadge({ difficulty }: { difficulty?: string }) {
    if (!showDifficulty || !difficulty || !difficultyColors[difficulty]) return null;
    return (
      <span className={`text-xs px-2 py-0.5 rounded border ${difficultyColors[difficulty]}`}>
        {getDifficultyLabel(difficulty)}
      </span>
    );
  }

  return (
    <div className="space-y-3">
      {exercises.map((exercise, index) => {
        const status = statuses[exercise.id] || (exercise.prerequisites.length === 0 ? "available" : "locked");
        const isAccessible = status === "available" || status === "completed";

        return (
          <div key={exercise.id}>
            {index > 0 && (
              <div className="flex justify-center py-1">
                <div className="w-px h-4 bg-[var(--border)]" />
              </div>
            )}
            {isAccessible ? (
              <Link
                href={`/modules/${module}/${exercise.id}`}
                className="block border border-[var(--border)] rounded-lg p-4 hover:bg-[var(--surface-hover)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{exercise.title}</span>
                      <DifficultyBadge difficulty={exercise.difficulty} />
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      {getStatusLabel(status)}
                    </div>
                  </div>
                  <span className="text-sm text-[var(--muted)]">&rarr;</span>
                </div>
              </Link>
            ) : (
              <div className="border border-[var(--border)] rounded-lg p-4 opacity-50">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{exercise.title}</span>
                      <DifficultyBadge difficulty={exercise.difficulty} />
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      {getStatusLabel(status)}
                      {exercise.prerequisites.length > 0 &&
                        ` — ${exercise.prerequisites.length === 1 ? t.progress.prerequisiteSingular : t.progress.prerequisitePlural}`}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
