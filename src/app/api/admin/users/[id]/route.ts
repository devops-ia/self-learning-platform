import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth/audit";
import { safeDecrypt, encrypt } from "@/lib/crypto";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const user = db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      totpEnabled: users.totpEnabled,
      emailVerified: users.emailVerified,
      disabled: users.disabled,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, id))
    .get();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      ...user,
      email: safeDecrypt(user.email),
      displayName: safeDecrypt(user.displayName),
    },
  });
}

const updateUserSchema = z.object({
  role: z.enum(["admin", "user"]).optional(),
  displayName: z.string().min(1).max(100).optional(),
  username: z.string().min(2).max(50).optional(),
  password: z.string().min(8).optional(),
  disabled: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = db.select().from(users).where(eq(users.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updates: Record<string, string | boolean | number> = { updatedAt: new Date().toISOString() };
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if (parsed.data.displayName !== undefined) updates.displayName = encrypt(parsed.data.displayName);
  if (parsed.data.username !== undefined) updates.username = parsed.data.username;
  if (parsed.data.password !== undefined) {
    const { hashPassword } = await import("@/lib/auth/password");
    updates.passwordHash = await hashPassword(parsed.data.password);
  }
  if (parsed.data.disabled !== undefined) updates.disabled = parsed.data.disabled;
  if (parsed.data.emailVerified !== undefined) updates.emailVerified = parsed.data.emailVerified;

  db.update(users).set(updates).where(eq(users.id, id)).run();

  logAudit("admin_user_edit", {
    userId: auth.userId,
    req,
    details: { targetUserId: id, changes: parsed.data },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;

  // Cannot delete yourself
  if (id === auth.userId) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  const existing = db.select().from(users).where(eq(users.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  db.delete(users).where(eq(users.id, id)).run();

  logAudit("admin_user_delete", {
    userId: auth.userId,
    req,
    details: { targetUserId: id, email: existing.email },
  });

  return NextResponse.json({ ok: true });
}
