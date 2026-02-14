import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const prefsSchema = z.object({
  theme: z.enum(["dark", "light"]).optional(),
  language: z.string().min(2).max(5).optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = prefsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Merge with existing preferences
  const user = db.select({ preferences: users.preferences }).from(users).where(eq(users.id, auth.userId)).get();
  const existing = user?.preferences ? JSON.parse(user.preferences) : {};
  const merged = { ...existing, ...parsed.data };

  db.update(users)
    .set({ preferences: JSON.stringify(merged), updatedAt: new Date().toISOString() })
    .where(eq(users.id, auth.userId))
    .run();

  return NextResponse.json({ ok: true });
}
