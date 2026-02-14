"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function useRequireAuth() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [demoMode, setDemoMode] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setDemoMode(!!data.demoMode))
      .catch(() => setDemoMode(false));
  }, []);

  const settingsLoaded = demoMode !== null;
  const shouldRedirect = settingsLoaded && !authLoading && !user && !demoMode;

  useEffect(() => {
    if (shouldRedirect) {
      router.push("/login");
    }
  }, [shouldRedirect, router]);

  return {
    loading: !settingsLoaded || authLoading || shouldRedirect,
    user,
    demoMode,
  };
}
