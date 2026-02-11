import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth/audit";

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
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, id))
    .get();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

const updateUserSchema = z.object({
  role: z.enum(["admin", "user"]).optional(),
  displayName: z.string().min(1).max(100).optional(),
  username: z.string().min(2).max(50).optional(),
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

  const updates: Record<string, string> = { updatedAt: new Date().toISOString() };
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if (parsed.data.displayName !== undefined) updates.displayName = parsed.data.displayName;
  if (parsed.data.username !== undefined) updates.username = parsed.data.username;

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
