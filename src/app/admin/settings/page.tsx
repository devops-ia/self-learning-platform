"use client";

import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n/context";

interface SettingToggleProps {
  label: string;
  description: string;
  value: boolean;
  saving: boolean;
  onToggle: () => void;
}

function SettingToggle({ label, description, value, saving, onToggle }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
      <div>
        <h3 className="font-medium">{label}</h3>
        <p className="text-sm text-[var(--muted)]">{description}</p>
      </div>
      <button
        onClick={onToggle}
        disabled={saving}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          value ? "bg-[var(--accent)]" : "bg-[var(--border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            value ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

interface SettingInputProps {
  label: string;
  description?: string;
  value: string;
  type?: "text" | "password";
  placeholder?: string;
  settingKey: string;
  saving: string;
  saveLabel: string;
  onSave: (key: string, value: string) => void;
  onChange: (key: string, value: string) => void;
}

function SettingInput({
  label,
  description,
  value,
  type = "text",
  placeholder,
  settingKey,
  saving,
  saveLabel,
  onSave,
  onChange,
}: SettingInputProps) {
  return (
    <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
      <h3 className="font-medium">{label}</h3>
      {description && <p className="text-sm text-[var(--muted)] mb-3">{description}</p>}
      {!description && <div className="mb-3" />}
      <div className="flex gap-2">
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(settingKey, e.target.value)}
          className="flex-1 px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded text-sm"
        />
        <button
          onClick={() => onSave(settingKey, value)}
          disabled={saving === settingKey}
          className="px-4 py-1.5 bg-[var(--accent)] text-white rounded text-sm hover:opacity-90 disabled:opacity-50"
        >
          {saving === settingKey ? "..." : saveLabel}
        </button>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { t } = useT();
  const saveLabel = t.adminPanel.save;

  const [toggles, setToggles] = useState<Record<string, boolean>>({
    registration_enabled: true,
    demo_mode: false,
    smtp_secure: false,
  });
  const [textSettings, setTextSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setToggles({
            registration_enabled: data.settings.registration_enabled !== "false",
            demo_mode: data.settings.demo_mode === "true",
            smtp_secure: data.settings.smtp_secure === "true",
          });
          setTextSettings({
            platform_title: data.settings.platform_title || "Self-Learning Platform",
            session_ttl: data.settings.session_ttl || "604800",
            base_url: data.settings.base_url || "http://localhost:3000",
            totp_issuer: data.settings.totp_issuer || "DevOps Learning Platform",
            smtp_host: data.settings.smtp_host || "",
            smtp_port: data.settings.smtp_port || "587",
            smtp_user: data.settings.smtp_user || "",
            smtp_pass: data.settings.smtp_pass || "",
            smtp_from: data.settings.smtp_from || "noreply@devopslab.local",
            oauth_google_client_id: data.settings.oauth_google_client_id || "",
            oauth_google_client_secret: data.settings.oauth_google_client_secret || "",
            oauth_github_client_id: data.settings.oauth_github_client_id || "",
            oauth_github_client_secret: data.settings.oauth_github_client_secret || "",
            oauth_azure_client_id: data.settings.oauth_azure_client_id || "",
            oauth_azure_client_secret: data.settings.oauth_azure_client_secret || "",
            oauth_azure_tenant: data.settings.oauth_azure_tenant || "common",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(key: string) {
    const newValue = !toggles[key];
    setSaving(key);
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: newValue ? "true" : "false" }),
      });
      setToggles((prev) => ({ ...prev, [key]: newValue }));
    } catch {
      // revert on error
    } finally {
      setSaving("");
    }
  }

  async function handleTextSave(key: string, value: string) {
    setSaving(key);
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
    } catch {
      // ignore
    } finally {
      setSaving("");
    }
  }

  function handleTextChange(key: string, value: string) {
    setTextSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-[var(--muted)]">...</div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">{t.adminPanel.settings}</h1>

      {/* General */}
      <div className="space-y-4">
        <SettingToggle
          label={t.adminPanel.registrationEnabled}
          description={t.adminPanel.registrationEnabledDesc}
          value={toggles.registration_enabled}
          saving={saving === "registration_enabled"}
          onToggle={() => handleToggle("registration_enabled")}
        />
        <SettingToggle
          label={t.adminPanel.demoMode}
          description={t.adminPanel.demoModeDesc}
          value={toggles.demo_mode}
          saving={saving === "demo_mode"}
          onToggle={() => handleToggle("demo_mode")}
        />
        <SettingInput
          label={t.adminPanel.platformTitle}
          description={t.adminPanel.platformTitleDesc}
          value={textSettings.platform_title || ""}
          settingKey="platform_title"
          saving={saving}
          saveLabel={saveLabel}
          onSave={handleTextSave}
          onChange={handleTextChange}
        />
      </div>

      {/* Session */}
      <h2 className="text-lg font-semibold mt-10 mb-4 pt-6 border-t border-[var(--border)]">
        {t.adminPanel.sessionSection}
      </h2>
      <div className="space-y-4">
        <SettingInput
          label={t.adminPanel.sessionTtl}
          description={t.adminPanel.sessionTtlDesc}
          value={textSettings.session_ttl || ""}
          settingKey="session_ttl"
          saving={saving}
          saveLabel={saveLabel}
          onSave={handleTextSave}
          onChange={handleTextChange}
        />
      </div>

      {/* App */}
      <h2 className="text-lg font-semibold mt-10 mb-4 pt-6 border-t border-[var(--border)]">
        {t.adminPanel.appSection}
      </h2>
      <div className="space-y-4">
        <SettingInput
          label={t.adminPanel.baseUrl}
          description={t.adminPanel.baseUrlDesc}
          value={textSettings.base_url || ""}
          placeholder="http://localhost:3000"
          settingKey="base_url"
          saving={saving}
          saveLabel={saveLabel}
          onSave={handleTextSave}
          onChange={handleTextChange}
        />
        <SettingInput
          label={t.adminPanel.totpIssuer}
          description={t.adminPanel.totpIssuerDesc}
          value={textSettings.totp_issuer || ""}
          placeholder="DevOps Learning Platform"
          settingKey="totp_issuer"
          saving={saving}
          saveLabel={saveLabel}
          onSave={handleTextSave}
          onChange={handleTextChange}
        />
      </div>

      {/* SMTP */}
      <h2 className="text-lg font-semibold mt-10 mb-4 pt-6 border-t border-[var(--border)]">
        {t.adminPanel.smtpSection}
      </h2>
      <div className="space-y-4">
        <SettingInput
          label={t.adminPanel.smtpHost}
          description={t.adminPanel.smtpHostDesc}
          value={textSettings.smtp_host || ""}
          settingKey="smtp_host"
          saving={saving}
          saveLabel={saveLabel}
          onSave={handleTextSave}
          onChange={handleTextChange}
        />
        <SettingInput
          label={t.adminPanel.smtpPort}
          value={textSettings.smtp_port || ""}
          settingKey="smtp_port"
          saving={saving}
          saveLabel={saveLabel}
          onSave={handleTextSave}
          onChange={handleTextChange}
        />
        <SettingInput
          label={t.adminPanel.smtpUser}
          value={textSettings.smtp_user || ""}
          settingKey="smtp_user"
          saving={saving}
          saveLabel={saveLabel}
          onSave={handleTextSave}
          onChange={handleTextChange}
        />
        <SettingInput
          label={t.adminPanel.smtpPass}
          value={textSettings.smtp_pass || ""}
          type="password"
          settingKey="smtp_pass"
          saving={saving}
          saveLabel={saveLabel}
          onSave={handleTextSave}
          onChange={handleTextChange}
        />
        <SettingInput
          label={t.adminPanel.smtpFrom}
          description={t.adminPanel.smtpFromDesc}
          value={textSettings.smtp_from || ""}
          settingKey="smtp_from"
          saving={saving}
          saveLabel={saveLabel}
          onSave={handleTextSave}
          onChange={handleTextChange}
        />
        <SettingToggle
          label={t.adminPanel.smtpSecure}
          description={t.adminPanel.smtpSecureDesc}
          value={toggles.smtp_secure}
          saving={saving === "smtp_secure"}
          onToggle={() => handleToggle("smtp_secure")}
        />
      </div>

      {/* OAuth: Google */}
      <h2 className="text-lg font-semibold mt-10 mb-4 pt-6 border-t border-[var(--border)]">
        {t.adminPanel.oauthGoogleSection}
      </h2>
      <div className="space-y-4">
        <SettingInput
          label={t.adminPanel.oauthGoogleClientId}
          value={textSettings.oauth_google_client_id || ""}
          settingKey="oauth_google_client_id"
          saving={saving}
          saveLabel={saveLabel}
          onSave={handleTextSave}
          onChange={handleTextChange}
        />
        <SettingInput
          label={t.adminPanel.oauthGoogleClientSecret}
          value={textSettings.oauth_google_client_secret || ""}
          type="password"
          settingKey="oauth_google_client_secret"
          saving={saving}
          saveLabel={saveLabel}
          onSave={handleTextSave}
          onChange={handleTextChange}
        />
      </div>

      {/* OAuth: GitHub */}
      <h2 className="text-lg font-semibold mt-10 mb-4 pt-6 border-t border-[var(--border)]">
        {t.adminPanel.oauthGithubSection}
      </h2>
      <div className="space-y-4">
        <SettingInput
          label={t.adminPanel.oauthGithubClientId}
          value={textSettings.oauth_github_client_id || ""}
          settingKey="oauth_github_client_id"
          saving={saving}
          saveLabel={saveLabel}
          onSave={handleTextSave}
          onChange={handleTextChange}
        />
        <SettingInput
          label={t.adminPanel.oauthGithubClientSecret}
          value={textSettings.oauth_github_client_secret || ""}
          type="password"
          settingKey="oauth_github_client_secret"
          saving={saving}
          saveLabel={saveLabel}
          onSave={handleTextSave}
          onChange={handleTextChange}
        />
      </div>

      {/* OAuth: Azure AD */}
      <h2 className="text-lg font-semibold mt-10 mb-4 pt-6 border-t border-[var(--border)]">
        {t.adminPanel.oauthAzureSection}
      </h2>
      <div className="space-y-4">
        <SettingInput
          label={t.adminPanel.oauthAzureClientId}
          value={textSettings.oauth_azure_client_id || ""}
          settingKey="oauth_azure_client_id"
          saving={saving}
          saveLabel={saveLabel}
          onSave={handleTextSave}
          onChange={handleTextChange}
        />
        <SettingInput
          label={t.adminPanel.oauthAzureClientSecret}
          value={textSettings.oauth_azure_client_secret || ""}
          type="password"
          settingKey="oauth_azure_client_secret"
          saving={saving}
          saveLabel={saveLabel}
          onSave={handleTextSave}
          onChange={handleTextChange}
        />
        <SettingInput
          label={t.adminPanel.oauthAzureTenant}
          description={t.adminPanel.oauthAzureTenantDesc}
          value={textSettings.oauth_azure_tenant || ""}
          placeholder="common"
          settingKey="oauth_azure_tenant"
          saving={saving}
          saveLabel={saveLabel}
          onSave={handleTextSave}
          onChange={handleTextChange}
        />
      </div>
    </div>
  );
}
