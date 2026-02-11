"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/context";

interface ModuleData {
  id: string;
  title: string;
  description: Record<string, string>;
  icon: string;
  prefix: string;
  language: string;
}

export default function Home() {
  const { t } = useT();
  const [modules, setModules] = useState<[string, ModuleData][]>([]);

  useEffect(() => {
    fetch("/api/modules")
      .then((r) => r.json())
      .then((data) => {
        if (data.modules) {
          setModules(data.modules.map((m: ModuleData) => [m.id, m]));
        }
      })
      .catch(() => {});
  }, []);

  const subtitle = t.home.subtitle.replace(
    "{modules}",
    modules.map(([, c]) => c.title).join(", ") || "..."
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)]">
      <h1 className="text-4xl font-bold tracking-tight mb-4">
        {t.home.title}
      </h1>
      <p className="text-[var(--muted)] text-lg mb-12 max-w-xl text-center">
        {subtitle}
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

      <div className="flex gap-4 flex-wrap justify-center">
        {modules.map(([slug, config], i) => (
          <Link
            key={slug}
            href={`/modules/${slug}`}
            className={
              i === 0
                ? "px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium transition-colors"
                : "px-6 py-3 border border-[var(--border)] hover:bg-[var(--surface-hover)] rounded-lg font-medium transition-colors"
            }
          >
            {config.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
