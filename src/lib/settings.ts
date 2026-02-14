import { db } from "./db";
import { settings } from "./db/schema";
import { eq } from "drizzle-orm";

interface CacheEntry {
  value: string;
  timestamp: number;
}

const CACHE_TTL = 30_000; // 30 seconds
const cache = new Map<string, CacheEntry>();

export function getSetting(key: string, fallback?: string): string | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  if (row) {
    cache.set(key, { value: row.value, timestamp: Date.now() });
    return row.value;
  }

  return fallback ?? null;
}

export function setSetting(key: string, value: string): void {
  const now = new Date().toISOString();
  const existing = db.select().from(settings).where(eq(settings.key, key)).get();
  if (existing) {
    db.update(settings).set({ value, updatedAt: now }).where(eq(settings.key, key)).run();
  } else {
    db.insert(settings).values({ key, value, updatedAt: now }).run();
  }
  cache.set(key, { value, timestamp: Date.now() });
}

export function isRegistrationEnabled(): boolean {
  const dbValue = getSetting("registration_enabled");
  if (dbValue !== null) return dbValue !== "false";
  return process.env.NEXT_PUBLIC_REGISTRATION_ENABLED !== "false";
}

export function isDemoMode(): boolean {
  const dbValue = getSetting("demo_mode");
  if (dbValue !== null) return dbValue === "true";
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function isAnonymousAccessEnabled(): boolean {
  const dbValue = getSetting("anonymous_access");
  if (dbValue !== null) return dbValue === "true";
  return false; // disabled by default
}

export function getPlatformTitle(): string {
  const dbValue = getSetting("platform_title");
  if (dbValue !== null) return dbValue;
  return process.env.PLATFORM_TITLE || "Self-Learning Platform";
}

export function invalidateSettingsCache(): void {
  cache.clear();
}

// Generic helper: check DB first, then env var, then default
export function getSettingValue(key: string, envVar: string, defaultValue: string): string {
  const dbValue = getSetting(key);
  if (dbValue !== null) return dbValue;
  return process.env[envVar] || defaultValue;
}

// Session
export function getSessionTTL(): number {
  return Number(getSettingValue("session_ttl", "SESSION_TTL", "604800"));
}

// Base URL
export function getBaseUrl(): string {
  return getSettingValue("base_url", "BASE_URL", "http://localhost:3000");
}

// TOTP
export function getTotpIssuer(): string {
  return getSettingValue("totp_issuer", "TOTP_ISSUER", "DevOps Learning Platform");
}

// SMTP
export function getSmtpHost(): string {
  return getSettingValue("smtp_host", "SMTP_HOST", "");
}
export function getSmtpPort(): number {
  return Number(getSettingValue("smtp_port", "SMTP_PORT", "587"));
}
export function getSmtpUser(): string {
  return getSettingValue("smtp_user", "SMTP_USER", "");
}
export function getSmtpPass(): string {
  return getSettingValue("smtp_pass", "SMTP_PASS", "");
}
export function getSmtpFrom(): string {
  return getSettingValue("smtp_from", "SMTP_FROM", "noreply@devopslab.local");
}
export function isSmtpSecure(): boolean {
  return getSettingValue("smtp_secure", "SMTP_SECURE", "false") === "true";
}

// OAuth Google
export function getOAuthGoogleClientId(): string {
  return getSettingValue("oauth_google_client_id", "OAUTH_GOOGLE_CLIENT_ID", "");
}
export function getOAuthGoogleClientSecret(): string {
  return getSettingValue("oauth_google_client_secret", "OAUTH_GOOGLE_CLIENT_SECRET", "");
}

// OAuth GitHub
export function getOAuthGithubClientId(): string {
  return getSettingValue("oauth_github_client_id", "OAUTH_GITHUB_CLIENT_ID", "");
}
export function getOAuthGithubClientSecret(): string {
  return getSettingValue("oauth_github_client_secret", "OAUTH_GITHUB_CLIENT_SECRET", "");
}

// OAuth Azure
export function getOAuthAzureClientId(): string {
  return getSettingValue("oauth_azure_client_id", "OAUTH_AZURE_CLIENT_ID", "");
}
export function getOAuthAzureClientSecret(): string {
  return getSettingValue("oauth_azure_client_secret", "OAUTH_AZURE_CLIENT_SECRET", "");
}
export function getOAuthAzureTenant(): string {
  return getSettingValue("oauth_azure_tenant", "OAUTH_AZURE_TENANT", "common");
}
