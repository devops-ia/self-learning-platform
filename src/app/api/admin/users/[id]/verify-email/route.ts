import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users, emailVerificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isSmtpConfigured, sendVerificationEmail } from "@/lib/email";
import { logAudit } from "@/lib/auth/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  if (!isSmtpConfigured()) {
    return NextResponse.json({ error: "SMTP not configured" }, { status: 400 });
  }

  const { id } = await params;
  const user = db.select({ email: users.email }).from(users).where(eq(users.id, id)).get();
  if (!user?.email) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.insert(emailVerificationTokens).values({ userId: id, token, expiresAt }).run();

  await sendVerificationEmail(user.email, token);

  logAudit("admin_resend_verification", {
    userId: auth.userId,
    req,
    details: { targetUserId: id },
  });

  return NextResponse.json({ ok: true });
}
