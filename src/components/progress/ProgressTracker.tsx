"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, Lock, Circle } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface ExerciseStatus {
  id: string;
  title: string;
  status: "locked" | "available" | "completed";
  prerequisites: string[];
}

interface ProgressTrackerProps {
  module: string;
  exercises: ExerciseStatus[];
}

export default function ProgressTracker({
  module,
  exercises,
}: ProgressTrackerProps) {
  const { t } = useT();
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    const userId = localStorage.getItem("devops-lab-user-id");
    if (!userId) {
      // No user yet, set first exercise as available
      const initial: Record<string, string> = {};
      exercises.forEach((ex, i) => {
        initial[ex.id] = i === 0 ? "available" : "locked";
      });
      setStatuses(initial);
      return;
    }

    fetch(`/api/progress?userId=${userId}&module=${module}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.progress && Object.keys(data.progress).length > 0) {
          setStatuses(data.progress);
        } else {
          const initial: Record<string, string> = {};
          exercises.forEach((ex, i) => {
            initial[ex.id] = i === 0 ? "available" : "locked";
          });
          setStatuses(initial);
        }
      })
      .catch(() => {
        const initial: Record<string, string> = {};
        exercises.forEach((ex, i) => {
          initial[ex.id] = i === 0 ? "available" : "locked";
        });
        setStatuses(initial);
      });
  }, [module, exercises]);

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

  return (
    <div className="space-y-3">
      {exercises.map((exercise, index) => {
        const status = statuses[exercise.id] || exercise.status;
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
                    <div className="font-medium">{exercise.title}</div>
                    <div className="text-sm text-[var(--muted)]">
                      {getStatusLabel(status)}
                    </div>
                  </div>
                  <span className="text-sm text-[var(--muted)]">→</span>
                </div>
              </Link>
            ) : (
              <div className="border border-[var(--border)] rounded-lg p-4 opacity-50">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status)}
                  <div className="flex-1">
                    <div className="font-medium">{exercise.title}</div>
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
