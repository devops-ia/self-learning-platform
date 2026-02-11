"use client";

import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { useT } from "@/lib/i18n/context";
import { Fingerprint } from "lucide-react";

export default function PasskeyButton() {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePasskeyLogin() {
    setError("");
    setLoading(true);
    try {
      const optionsRes = await fetch("/api/auth/passkey/auth-options", {
        method: "POST",
      });
      const options = await optionsRes.json();

      const authResponse = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/passkey/auth-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: authResponse }),
      });

      const data = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(data.error || t.auth.loginError);
        return;
      }

      window.location.href = "/";
    } catch {
      setError(t.auth.loginError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-2 p-2 rounded bg-[var(--error)]/10 text-[var(--error)] text-xs">
          {error}
        </div>
      )}
      <button
        onClick={handlePasskeyLogin}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full py-2 px-4 border border-[var(--border)] rounded font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50"
      >
        <Fingerprint className="w-4 h-4" />
        {loading ? t.auth.verifying : "Passkey"}
      </button>
    </div>
  );
}
