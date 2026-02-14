import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { modules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { invalidateExerciseCache } from "@/lib/exercises";

export const dynamic = "force-dynamic";

const reorderSchema = z.object({
  moduleIds: z.array(z.string().min(1)).min(1),
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

  const { moduleIds } = parsed.data;
  for (let i = 0; i < moduleIds.length; i++) {
    db.update(modules)
      .set({ sortOrder: i })
      .where(eq(modules.id, moduleIds[i]))
      .run();
  }

  invalidateExerciseCache();
  return NextResponse.json({ ok: true });
}
