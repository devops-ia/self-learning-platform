import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { modules, exercises } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { invalidateExerciseCache } from "@/lib/exercises";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const row = db.select().from(modules).where(eq(modules.id, id)).get();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ...row, description: JSON.parse(row.description) });
}

const updateModuleSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.record(z.string(), z.string()).optional(),
  icon: z.string().optional(),
  prefix: z.string().min(1).max(10).optional(),
  language: z.string().optional(),
  showDifficulty: z.boolean().optional(),
  image: z.string().max(700_000).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateModuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = db.select().from(modules).where(eq(modules.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = JSON.stringify(parsed.data.description);
  if (parsed.data.icon !== undefined) updates.icon = parsed.data.icon;
  if (parsed.data.prefix !== undefined) updates.prefix = parsed.data.prefix;
  if (parsed.data.language !== undefined) updates.language = parsed.data.language;
  if (parsed.data.showDifficulty !== undefined) updates.showDifficulty = parsed.data.showDifficulty;
  if (parsed.data.image !== undefined) updates.image = parsed.data.image;
  if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder;

  if (Object.keys(updates).length > 0) {
    db.update(modules).set(updates).where(eq(modules.id, id)).run();
    invalidateExerciseCache();
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;

  // Delete all exercises in this module first
  db.delete(exercises).where(eq(exercises.moduleId, id)).run();
  db.delete(modules).where(eq(modules.id, id)).run();

  invalidateExerciseCache();
  return NextResponse.json({ ok: true });
}
