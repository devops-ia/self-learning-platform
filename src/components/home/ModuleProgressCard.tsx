"use client";

import Link from "next/link";
import Image from "next/image";
import { useT } from "@/lib/i18n/context";

interface ModuleProgressCardProps {
  id: string;
  title: string;
  description: Record<string, string>;
  image?: string;
  icon: string;
  total: number;
  completed: number;
}

export default function ModuleProgressCard({
  id,
  title,
  description,
  image,
  total,
  completed,
}: ModuleProgressCardProps) {
  const { lang } = useT();
  const desc = description[lang] || description.es || "";
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Link
      href={`/modules/${id}`}
      className="block bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden hover:bg-[var(--surface-hover)] transition-colors"
    >
      {image ? (
        <div className="h-36 w-full overflow-hidden relative">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div className="h-36 w-full flex items-center justify-center bg-[var(--border)]/20 text-4xl text-[var(--muted)]">
          {title[0]}
        </div>
      )}

      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-lg">{title}</h3>
        {desc && (
          <p className="text-sm text-[var(--muted)] line-clamp-2">{desc}</p>
        )}

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-[var(--muted)]">
            <span>
              {completed}/{total}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
