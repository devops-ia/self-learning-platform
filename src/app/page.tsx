"use client";

import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n/context";
import { useAuth } from "@/components/auth/AuthProvider";
import ModuleProgressCard from "@/components/home/ModuleProgressCard";

interface ModuleData {
  id: string;
  title: string;
  description: Record<string, string>;
  icon: string;
  prefix: string;
  language: string;
  image?: string;
}

interface ProgressSummary {
  [moduleId: string]: { total: number; completed: number };
}

export default function Home() {
  const { t } = useT();
  const { user, loading: authLoading } = useAuth();
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [progressData, setProgressData] = useState<ProgressSummary>({});
  const [isDemo, setIsDemo] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setIsDemo(!!data.demoMode);
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    fetch("/api/modules")
      .then((r) => r.json())
      .then((data) => {
        if (data.modules) setModules(data.modules);
      })
      .catch(() => {});
  }, [settingsLoaded]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/progress/summary")
      .then((r) => r.json())
      .then((data) => {
        if (data.modules) setProgressData(data.modules);
      })
      .catch(() => {});
  }, [user]);

  // Wait for both auth and settings to resolve before rendering
  if (authLoading || !settingsLoaded) {
    return <div className="min-h-[calc(100vh-57px)]" />;
  }

  // Show module cards when signed in OR when demo mode is enabled
  const showModuleCards = user || isDemo;

  if (showModuleCards) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">{t.home.welcomeBack}</h1>
        <p className="text-[var(--muted)] mb-8">{t.home.welcomeBackDesc}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod) => {
            const prog = progressData[mod.id] || { total: 0, completed: 0 };
            return (
              <ModuleProgressCard
                key={mod.id}
                id={mod.id}
                title={mod.title}
                description={mod.description}
                image={mod.image}
                icon={mod.icon}
                total={prog.total}
                completed={prog.completed}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)]">
      <h1 className="text-4xl font-bold tracking-tight mb-4">
        {t.home.title}
      </h1>
      <p className="text-[var(--muted)] text-lg mb-12 max-w-xl text-center">
        {t.home.subtitle}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 max-w-2xl w-full px-6">
        <div className="border border-[var(--border)] rounded-lg p-6 text-center">
          <div className="text-2xl mb-2">1</div>
          <div className="font-medium mb-1">{t.home.step1Title}</div>
          <div className="text-sm text-[var(--muted)]">{t.home.step1Desc}</div>
        </div>
        <div className="border border-[var(--border)] rounded-lg p-6 text-center">
          <div className="text-2xl mb-2">2</div>
          <div className="font-medium mb-1">{t.home.step2Title}</div>
          <div className="text-sm text-[var(--muted)]">{t.home.step2Desc}</div>
        </div>
        <div className="border border-[var(--border)] rounded-lg p-6 text-center">
          <div className="text-2xl mb-2">3</div>
          <div className="font-medium mb-1">{t.home.step3Title}</div>
          <div className="text-sm text-[var(--muted)]">{t.home.step3Desc}</div>
        </div>
      </div>

    </div>
  );
}
