import { z } from "zod";

const configSchema = z.object({
  // Session
  SESSION_SECRET: z.string().min(32).default("dev-secret-change-me-in-production-32chars!!"),
  SESSION_TTL: z.coerce.number().default(604800), // 7 days in seconds

  // Auth feature flags
  AUTH_ANONYMOUS_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  AUTH_EMAIL_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

  // OAuth: Google
  OAUTH_GOOGLE_CLIENT_ID: z.string().default(""),
  OAUTH_GOOGLE_CLIENT_SECRET: z.string().default(""),
  OAUTH_GOOGLE_CALLBACK: z.string().default("/api/auth/oauth/google/callback"),

  // OAuth: GitHub
  OAUTH_GITHUB_CLIENT_ID: z.string().default(""),
  OAUTH_GITHUB_CLIENT_SECRET: z.string().default(""),
  OAUTH_GITHUB_CALLBACK: z.string().default("/api/auth/oauth/github/callback"),

  // OAuth: Azure AD
  OAUTH_AZURE_CLIENT_ID: z.string().default(""),
  OAUTH_AZURE_CLIENT_SECRET: z.string().default(""),
  OAUTH_AZURE_TENANT: z.string().default("common"),
  OAUTH_AZURE_CALLBACK: z.string().default("/api/auth/oauth/azure/callback"),

  // TOTP
  TOTP_ISSUER: z.string().default("DevOps Learning Platform"),

  // App
  BASE_URL: z.string().url().default("http://localhost:3000"),

  // Database
  DB_TYPE: z.enum(["sqlite"]).default("sqlite"),
  DB_URL: z.string().default("data/learning-platform.db"),

  // Admin seed
  ADMIN_EMAIL: z.string().email().default("admin@devopslab.local"),
  ADMIN_PASSWORD: z.string().min(8).default("admin1234"),
});

function loadConfig() {
  const raw: Record<string, string | undefined> = {};
  for (const key of Object.keys(configSchema.shape)) {
    raw[key] = process.env[key];
  }

  // Remove undefined values so defaults are applied
  const cleaned = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== undefined)
  );

  return configSchema.parse(cleaned);
}

export type AppConfig = z.infer<typeof configSchema>;
export const config = loadConfig();

// Helpers
export const isOAuthEnabled = (provider: "google" | "github" | "azure") => {
  switch (provider) {
    case "google":
      return !!(config.OAUTH_GOOGLE_CLIENT_ID && config.OAUTH_GOOGLE_CLIENT_SECRET);
    case "github":
      return !!(config.OAUTH_GITHUB_CLIENT_ID && config.OAUTH_GITHUB_CLIENT_SECRET);
    case "azure":
      return !!(config.OAUTH_AZURE_CLIENT_ID && config.OAUTH_AZURE_CLIENT_SECRET);
  }
};

export const enabledOAuthProviders = () =>
  (["google", "github", "azure"] as const).filter(isOAuthEnabled);
