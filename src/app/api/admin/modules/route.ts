import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { modules } from "@/lib/db/schema";
import { invalidateExerciseCache } from "@/lib/exercises";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const rows = db.select().from(modules).orderBy(modules.sortOrder).all();
  return NextResponse.json({
    modules: rows.map((r) => ({
      ...r,
      description: JSON.parse(r.description),
    })),
  });
}

const createModuleSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(100),
  description: z.record(z.string(), z.string()),
  icon: z.string().default("Terminal"),
  prefix: z.string().min(1).max(10),
  language: z.string().default("yaml"),
  sortOrder: z.number().int().default(0),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = createModuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id, title, description, icon, prefix, language, sortOrder } = parsed.data;

  db.insert(modules)
    .values({
      id,
      title,
      description: JSON.stringify(description),
      icon,
      prefix,
      language,
      sortOrder,
      createdAt: new Date().toISOString(),
    })
    .run();

  invalidateExerciseCache();
  return NextResponse.json({ id, title });
}
