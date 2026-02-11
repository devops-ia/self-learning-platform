"use client";

import { useState, useEffect } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { useT } from "@/lib/i18n/context";
import { Fingerprint, Trash2 } from "lucide-react";

interface Passkey {
  id: number;
  name: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  deviceType: string | null;
}

export default function PasskeyManager() {
  const { t } = useT();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  async function loadPasskeys() {
    try {
      const res = await fetch("/api/auth/passkey/list");
      if (res.ok) {
        const data = await res.json();
        setPasskeys(data.passkeys || []);
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadPasskeys();
  }, []);

  async function handleRegister() {
    setError("");
    setLoading(true);
    try {
      const optionsRes = await fetch("/api/auth/passkey/register-options", {
        method: "POST",
      });
      const options = await optionsRes.json();

      const attResponse = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: attResponse, name: newName || "Passkey" }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        setError(data.error || "Registration failed");
        return;
      }

      setNewName("");
      setShowAdd(false);
      await loadPasskeys();
    } catch {
      setError("Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(passkeyId: number) {
    setError("");
    try {
      const res = await fetch(`/api/auth/passkey/${passkeyId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to remove passkey");
        return;
      }
      await loadPasskeys();
    } catch {
      setError("Failed to remove passkey");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{t.security.passkeys}</h3>
          <p className="text-sm text-[var(--muted)]">{t.security.passkeysDesc}</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-[var(--error)]/10 text-[var(--error)] text-sm">
          {error}
        </div>
      )}

      {passkeys.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t.security.noPasskeys}</p>
      ) : (
        <div className="space-y-2">
          {passkeys.map((pk) => (
            <div
              key={pk.id}
              className="flex items-center justify-between p-3 bg-[var(--surface)] rounded border border-[var(--border)]"
            >
              <div className="flex items-center gap-3">
                <Fingerprint className="w-5 h-5 text-[var(--muted)]" />
                <div>
                  <p className="text-sm font-medium">{pk.name || "Passkey"}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {t.security.lastUsed}:{" "}
                    {pk.lastUsedAt
                      ? new Date(pk.lastUsedAt).toLocaleDateString()
                      : t.security.never}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRemove(pk.id)}
                className="text-[var(--error)] hover:text-[var(--error)]/80 transition-colors"
                title={t.security.removePasskey}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd ? (
        <div className="space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t.security.passkeyName}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
          />
          <div className="flex gap-2">
            <button
              onClick={handleRegister}
              disabled={loading}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {t.security.addPasskey}
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setNewName("");
              }}
              className="px-4 py-2 border border-[var(--border)] rounded hover:bg-[var(--surface-hover)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors"
        >
          {t.security.addPasskey}
        </button>
      )}
    </div>
  );
}
