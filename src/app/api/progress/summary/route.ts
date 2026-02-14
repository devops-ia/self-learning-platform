import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { progress, exercises as exercisesTable } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth/session";
import { getModulesFromDB } from "@/lib/exercises";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ modules: {} });
  }

  const allModules = getModulesFromDB();
  const result: Record<string, { total: number; completed: number }> = {};

  for (const mod of allModules) {
    // Count total exercises in this module
    const totalRow = db
      .select({ count: sql<number>`count(*)` })
      .from(exercisesTable)
      .where(eq(exercisesTable.moduleId, mod.id))
      .get();

    const total = totalRow?.count ?? 0;

    // Count completed exercises for this user in this module
    const completedRow = db
      .select({ count: sql<number>`count(*)` })
      .from(progress)
      .innerJoin(exercisesTable, eq(progress.exerciseId, exercisesTable.id))
      .where(
        and(
          eq(progress.userId, userId),
          eq(exercisesTable.moduleId, mod.id),
          eq(progress.status, "completed")
        )
      )
      .get();

    const completed = completedRow?.count ?? 0;

    result[mod.id] = { total, completed };
  }

  return NextResponse.json({ modules: result });
}
