import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, progress } from "@/lib/db/schema";
import { eq, and, like } from "drizzle-orm";
import { getModuleExercises, getModuleFromDB } from "@/lib/exercises";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const moduleName = searchParams.get("module");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Ensure user exists
  const existingUser = db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!existingUser) {
    // Create user and initialize progress
    db.insert(users)
      .values({ id: userId, username: "anonymous", createdAt: new Date().toISOString() })
      .run();
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
