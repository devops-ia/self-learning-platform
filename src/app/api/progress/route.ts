import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { progress } from "@/lib/db/schema";
import { eq, and, like } from "drizzle-orm";
import { getModuleExercises, getModuleFromDB } from "@/lib/exercises";
import { getCurrentUserId } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/settings";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const moduleName = searchParams.get("module");

  // Require authenticated user
  const userId = await getCurrentUserId();
  if (!userId) {
    if (isDemoMode()) {
      // In demo mode without login, return empty progress
      const exercises = moduleName ? getModuleExercises(moduleName) : [];
      const progressMap: Record<string, string> = {};
      for (const ex of exercises) {
        progressMap[ex.id] = ex.prerequisites.length === 0 ? "available" : "locked";
      }
      return NextResponse.json({ progress: progressMap });
    }
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const moduleConf = moduleName ? getModuleFromDB(moduleName) : null;
  const prefix = moduleConf ? `${moduleConf.prefix}-` : "";

  const rows = prefix
    ? db
        .select()
        .from(progress)
        .where(and(eq(progress.userId, userId), like(progress.exerciseId, `${prefix}%`)))
        .all()
    : db.select().from(progress).where(eq(progress.userId, userId)).all();

  // Build progress map
  const progressMap: Record<string, string> = {};
  for (const row of rows) {
    progressMap[row.exerciseId] = row.status;
  }

  // If no progress exists for this module, initialize it
  if (moduleName && Object.keys(progressMap).length === 0) {
    const exercises = getModuleExercises(moduleName);
    for (const ex of exercises) {
      const status = ex.prerequisites.length === 0 ? "available" : "locked";
      progressMap[ex.id] = status;

      // Insert into DB
      const existing = db
        .select()
        .from(progress)
        .where(and(eq(progress.userId, userId), eq(progress.exerciseId, ex.id)))
        .get();

      if (!existing) {
        db.insert(progress)
          .values({ userId, exerciseId: ex.id, status })
          .run();
      }
    }
  }

  return NextResponse.json({ progress: progressMap });
}
