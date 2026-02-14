import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { getSetting, setSetting, invalidateSettingsCache } from "@/lib/settings";

export const dynamic = "force-dynamic";

const ALLOWED_KEYS = [
  "registration_enabled", "demo_mode", "platform_title",
  "session_ttl", "base_url", "totp_issuer",
  "smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from", "smtp_secure",
  "oauth_google_client_id", "oauth_google_client_secret",
  "oauth_github_client_id", "oauth_github_client_secret",
  "oauth_azure_client_id", "oauth_azure_client_secret", "oauth_azure_tenant",
];

const SECRET_KEYS = ["smtp_pass", "oauth_google_client_secret", "oauth_github_client_secret", "oauth_azure_client_secret"];

const MASK = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const defaults: Record<string, string> = {
    registration_enabled: "true",
    demo_mode: "false",
    platform_title: "Self-Learning Platform",
    session_ttl: "604800",
    base_url: "http://localhost:3000",
    totp_issuer: "DevOps Learning Platform",
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_pass: "",
    smtp_from: "noreply@devopslab.local",
    smtp_secure: "false",
    oauth_google_client_id: "",
    oauth_google_client_secret: "",
    oauth_github_client_id: "",
    oauth_github_client_secret: "",
    oauth_azure_client_id: "",
    oauth_azure_client_secret: "",
    oauth_azure_tenant: "common",
  };
  const result: Record<string, string> = {};
  for (const key of ALLOWED_KEYS) {
    const value = getSetting(key, defaults[key]) || defaults[key];
    if (SECRET_KEYS.includes(key) && value && value.length > 0) {
      result[key] = MASK;
    } else {
      result[key] = value;
    }
  }

  return NextResponse.json({ settings: result });
}

const updateSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (!ALLOWED_KEYS.includes(parsed.data.key)) {
    return NextResponse.json({ error: "Unknown setting" }, { status: 400 });
  }

  // Don't overwrite actual secret with the mask placeholder
  if (SECRET_KEYS.includes(parsed.data.key) && parsed.data.value === MASK) {
    return NextResponse.json({ ok: true });
  }

  setSetting(parsed.data.key, parsed.data.value);
  invalidateSettingsCache();
  return NextResponse.json({ ok: true });
}
