import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { exercises } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { invalidateExerciseCache } from "@/lib/exercises";

export const dynamic = "force-dynamic";

const reorderSchema = z.object({
  moduleId: z.string().min(1),
  exerciseIds: z.array(z.string().min(1)).min(1),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { exerciseIds } = parsed.data;

  for (let i = 0; i < exerciseIds.length; i++) {
    db.update(exercises)
      .set({ sortOrder: i, updatedAt: new Date().toISOString() })
      .where(eq(exercises.id, exerciseIds[i]))
      .run();
  }

  invalidateExerciseCache();
  return NextResponse.json({ ok: true });
}
