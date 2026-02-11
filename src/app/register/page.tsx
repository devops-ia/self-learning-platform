"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import RegisterForm from "@/components/auth/RegisterForm";
import { useT } from "@/lib/i18n/context";

export default function RegisterPage() {
  const { user, loading } = useAuth();
  const { t } = useT();

  useEffect(() => {
    if (!loading && user) {
      window.location.href = "/";
    }
  }, [user, loading]);

  if (loading) return null;
  if (user) return null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t.auth.register}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {t.auth.registerSubtitle}
          </p>
        </div>

        <RegisterForm />

        <p className="text-center text-sm text-[var(--muted)]">
          {t.auth.hasAccount}{" "}
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            {t.auth.login}
          </Link>
        </p>
      </div>
    </div>
  );
}
