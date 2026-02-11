"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/context";
import { Users, ScrollText, BookOpen, Layers } from "lucide-react";

export default function AdminPage() {
  const { t } = useT();

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">{t.adminPanel.title}</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/users"
          className="flex items-center gap-4 p-6 bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
        >
          <Users className="w-8 h-8 text-[var(--accent)]" />
          <div>
            <h2 className="font-semibold">{t.adminPanel.users}</h2>
            <p className="text-sm text-[var(--muted)]">
              Manage user accounts and roles
            </p>
          </div>
        </Link>

        <Link
          href="/admin/audit"
          className="flex items-center gap-4 p-6 bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
        >
          <ScrollText className="w-8 h-8 text-[var(--accent)]" />
          <div>
            <h2 className="font-semibold">{t.adminPanel.auditLog}</h2>
            <p className="text-sm text-[var(--muted)]">
              View authentication events
            </p>
          </div>
        </Link>

        <Link
          href="/admin/exercises"
          className="flex items-center gap-4 p-6 bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
        >
          <BookOpen className="w-8 h-8 text-[var(--accent)]" />
          <div>
            <h2 className="font-semibold">{t.adminPanel.exercises || "Exercises"}</h2>
            <p className="text-sm text-[var(--muted)]">
              {t.adminPanel.exercisesDesc || "Manage exercise definitions"}
            </p>
          </div>
        </Link>

        <Link
          href="/admin/modules"
          className="flex items-center gap-4 p-6 bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
        >
          <Layers className="w-8 h-8 text-[var(--accent)]" />
          <div>
            <h2 className="font-semibold">{t.adminPanel.modules || "Modules"}</h2>
            <p className="text-sm text-[var(--muted)]">
              {t.adminPanel.modulesDesc || "Manage technology modules"}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
