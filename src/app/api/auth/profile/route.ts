import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, validatePassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/auth/audit";
import { encrypt } from "@/lib/crypto";

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  username: z.string().min(2).max(50).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);

  // Check if this is a password change
  if (body?.currentPassword && body?.newPassword) {
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const user = db.select().from(users).where(eq(users.id, auth.userId)).get();
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const valid = await verifyPassword(user.passwordHash, parsed.data.currentPassword);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const pwCheck = validatePassword(parsed.data.newPassword);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.error }, { status: 400 });
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    db.update(users)
      .set({ passwordHash: newHash, updatedAt: new Date().toISOString() })
      .where(eq(users.id, auth.userId))
      .run();

    logAudit("password_change", { userId: auth.userId, req });
    return NextResponse.json({ ok: true, message: "Password updated" });
  }

  // Profile update
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, string> = { updatedAt: new Date().toISOString() };
  if (parsed.data.displayName !== undefined) updates.displayName = encrypt(parsed.data.displayName);
  if (parsed.data.username !== undefined) updates.username = parsed.data.username;

  db.update(users)
    .set(updates)
    .where(eq(users.id, auth.userId))
    .run();

  return NextResponse.json({ ok: true });
}
