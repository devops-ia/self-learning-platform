import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { NextRequest } from "next/server";

export type AuditAction =
  | "login"
  | "login_failed"
  | "logout"
  | "register"
  | "password_change"
  | "totp_enable"
  | "totp_disable"
  | "passkey_register"
  | "passkey_remove"
  | "oauth_link"
  | "admin_user_edit"
  | "admin_user_delete"
  | "admin_resend_verification";

export function logAudit(
  action: AuditAction,
  opts: {
    userId?: string;
    req?: NextRequest;
    details?: Record<string, unknown>;
  } = {}
) {
  const ip = opts.req?.headers.get("x-forwarded-for") || opts.req?.headers.get("x-real-ip") || null;
  const userAgent = opts.req?.headers.get("user-agent") || null;

  db.insert(auditLog)
    .values({
      userId: opts.userId || null,
      action,
      ip,
      userAgent,
      details: opts.details ? JSON.stringify(opts.details) : null,
      createdAt: new Date().toISOString(),
    })
    .run();
}
