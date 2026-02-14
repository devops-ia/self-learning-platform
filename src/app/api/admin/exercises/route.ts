import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { exercises, modules } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { invalidateExerciseCache } from "@/lib/exercises";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const moduleFilter = searchParams.get("module");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "50", 10)));

  // Count total
  let countQuery = db.select({ value: count() }).from(exercises);
  if (moduleFilter) {
    countQuery = countQuery.where(eq(exercises.moduleId, moduleFilter)) as typeof countQuery;
  }
  const total = countQuery.get()?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Fetch page
  let query = db
    .select({
      id: exercises.id,
      moduleId: exercises.moduleId,
      title: exercises.title,
      language: exercises.language,
      sortOrder: exercises.sortOrder,
      createdAt: exercises.createdAt,
      updatedAt: exercises.updatedAt,
    })
    .from(exercises);

  if (moduleFilter) {
    query = query.where(eq(exercises.moduleId, moduleFilter)) as typeof query;
  }

  const rows = query
    .orderBy(exercises.moduleId, exercises.sortOrder, desc(exercises.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)
    .all();

  return NextResponse.json({ exercises: rows, total, page, limit, totalPages });
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

const createExerciseSchema = z.object({
  id: z.string().min(1).max(100),
  moduleId: z.string().min(1),
  title: z.string().min(1),
  briefing: z.string().min(1),
  language: z.string().min(1),
  initialCode: z.string().min(1),
  prerequisites: z.array(z.string()).default([]),
  hints: z.array(z.string()).default([]),
  successMessage: z.string().min(1),
  validations: z.array(
    z.object({
      type: z.enum(["syntax", "semantic", "intention"]),
      errorMessage: z.string(),
      check: checkSchema,
      failMessage: z.string(),
    })
  ),
  terminalCommands: z.record(z.string(), z.array(z.object({
    when: checkSchema.optional(),
    output: z.string(),
    exitCode: z.number(),
  }))),
  i18n: z.record(z.string(), z.object({
    title: z.string().optional(),
    briefing: z.string().optional(),
    hints: z.array(z.string()).optional(),
    successMessage: z.string().optional(),
  })).optional(),
  sortOrder: z.number().int().default(0),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = createExerciseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Verify module exists
  const moduleExists = db.select().from(modules).where(eq(modules.id, data.moduleId)).get();
  if (!moduleExists) {
    return NextResponse.json({ error: "Module not found" }, { status: 400 });
  }

  db.insert(exercises)
    .values({
      id: data.id,
      moduleId: data.moduleId,
      title: data.title,
      briefing: data.briefing,
      language: data.language,
      initialCode: data.initialCode,
      prerequisites: JSON.stringify(data.prerequisites),
      hints: JSON.stringify(data.hints),
      successMessage: data.successMessage,
      validations: JSON.stringify(data.validations),
      terminalCommands: JSON.stringify(data.terminalCommands),
      i18n: data.i18n ? JSON.stringify(data.i18n) : null,
      sortOrder: data.sortOrder,
      createdAt: new Date().toISOString(),
    })
    .run();

  invalidateExerciseCache();
  return NextResponse.json({ id: data.id, title: data.title });
}
