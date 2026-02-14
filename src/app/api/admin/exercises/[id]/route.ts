import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { exercises } from "@/lib/db/schema";
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
  const row = db.select().from(exercises).where(eq(exercises.id, id)).get();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...row,
    prerequisites: JSON.parse(row.prerequisites),
    hints: JSON.parse(row.hints),
    validations: JSON.parse(row.validations),
    terminalCommands: JSON.parse(row.terminalCommands),
    i18n: row.i18n ? JSON.parse(row.i18n) : null,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const checkSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    contains: z.string().optional(),
    not_contains: z.string().optional(),
    match: z.string().optional(),
    not_match: z.string().optional(),
    yaml_valid: z.literal(true).optional(),
    yaml_has: z.string().optional(),
    yaml_not_has: z.string().optional(),
    yaml_is_array: z.string().optional(),
    yaml_equals: z.object({ path: z.string(), value: z.unknown() }).optional(),
    yaml_items_have: z.object({ path: z.string(), fields: z.array(z.string()) }).optional(),
    custom: z.string().optional(),
    all: z.array(checkSchema).optional(),
    any: z.array(checkSchema).optional(),
    not: checkSchema.optional(),
  })
);

const updateExerciseSchema = z.object({
  title: z.string().min(1).optional(),
  briefing: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  initialCode: z.string().min(1).optional(),
  prerequisites: z.array(z.string()).optional(),
  hints: z.array(z.string()).optional(),
  successMessage: z.string().min(1).optional(),
  validations: z.array(z.object({
    type: z.enum(["syntax", "semantic", "intention"]),
    errorMessage: z.string(),
    check: checkSchema,
    failMessage: z.string(),
  })).optional(),
  terminalCommands: z.record(z.string(), z.array(z.object({
    when: checkSchema.optional(),
    output: z.string(),
    exitCode: z.number(),
  }))).optional(),
  i18n: z.record(z.string(), z.object({
    title: z.string().optional(),
    briefing: z.string().optional(),
    hints: z.array(z.string()).optional(),
    successMessage: z.string().optional(),
  })).nullable().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional(),
  sortOrder: z.number().int().optional(),
  moduleId: z.string().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateExerciseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = db.select().from(exercises).where(eq(exercises.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  const d = parsed.data;
  if (d.title !== undefined) updates.title = d.title;
  if (d.briefing !== undefined) updates.briefing = d.briefing;
  if (d.language !== undefined) updates.language = d.language;
  if (d.initialCode !== undefined) updates.initialCode = d.initialCode;
  if (d.prerequisites !== undefined) updates.prerequisites = JSON.stringify(d.prerequisites);
  if (d.hints !== undefined) updates.hints = JSON.stringify(d.hints);
  if (d.successMessage !== undefined) updates.successMessage = d.successMessage;
  if (d.validations !== undefined) updates.validations = JSON.stringify(d.validations);
  if (d.terminalCommands !== undefined) updates.terminalCommands = JSON.stringify(d.terminalCommands);
  if (d.i18n !== undefined) updates.i18n = d.i18n ? JSON.stringify(d.i18n) : null;
  if (d.difficulty !== undefined) updates.difficulty = d.difficulty;
  if (d.sortOrder !== undefined) updates.sortOrder = d.sortOrder;
  if (d.moduleId !== undefined) updates.moduleId = d.moduleId;

  db.update(exercises).set(updates).where(eq(exercises.id, id)).run();
  invalidateExerciseCache();

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  db.delete(exercises).where(eq(exercises.id, id)).run();
  invalidateExerciseCache();

  return NextResponse.json({ ok: true });
}
