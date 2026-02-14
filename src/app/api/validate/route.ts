import { NextRequest, NextResponse } from "next/server";
import { validateExercise } from "@/lib/validators/engine";
import { db } from "@/lib/db";
import { submissions, progress, exercises as exercisesTable } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/settings";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { exerciseId, code, failureCount = 0, lang } = body;

  if (!exerciseId || !code) {
    return NextResponse.json(
      { error: "exerciseId and code are required" },
      { status: 400 }
    );
  }

  // Require authenticated user (demo mode skips auth but won't store progress)
  const userId = await getCurrentUserId();
  if (!userId && !isDemoMode()) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const result = validateExercise(exerciseId, code, failureCount, lang || "es");

  // Store submission only for authenticated users
  if (userId) {
    try {
      // Record submission
      db.insert(submissions)
        .values({
          userId,
          exerciseId,
          code,
          result: result.passed ? "pass" : "fail",
          feedback: result.summary,
          submittedAt: new Date().toISOString(),
        })
        .run();

      // Update progress if passed
      if (result.passed) {
        const existingProgress = db
          .select()
          .from(progress)
          .where(and(eq(progress.userId, userId), eq(progress.exerciseId, exerciseId)))
          .get();

        if (existingProgress) {
          db.update(progress)
            .set({ status: "completed", completedAt: new Date().toISOString() })
            .where(eq(progress.id, existingProgress.id))
            .run();
        } else {
          db.insert(progress)
            .values({
              userId,
              exerciseId,
              status: "completed",
              completedAt: new Date().toISOString(),
            })
            .run();
        }

        // Unlock next exercises that depend on this one
        unlockDependentExercises(userId, exerciseId);
      }
    } catch (e) {
      console.error("Error storing submission:", e);
    }
  }

  return NextResponse.json(result);
}

function unlockDependentExercises(userId: string, completedExerciseId: string) {
  // Only query exercises in the same module as the completed exercise
  const completedExercise = db
    .select({ moduleId: exercisesTable.moduleId })
    .from(exercisesTable)
    .where(eq(exercisesTable.id, completedExerciseId))
    .get();
  if (!completedExercise) return;

  const moduleExercises = db
    .select({ id: exercisesTable.id, prerequisites: exercisesTable.prerequisites })
    .from(exercisesTable)
    .where(eq(exercisesTable.moduleId, completedExercise.moduleId))
    .all();

  // Pre-fetch all user progress for this module in one query
  const userProgress = db
    .select()
    .from(progress)
    .where(eq(progress.userId, userId))
    .all();
  const progressMap = new Map(userProgress.map((p) => [p.exerciseId, p]));

  for (const row of moduleExercises) {
    const prereqs: string[] = JSON.parse(row.prerequisites);
    if (!prereqs.includes(completedExerciseId)) continue;

    // Check if all prerequisites are met using the pre-fetched map
    const allMet = prereqs.every((prereqId: string) => {
      return progressMap.get(prereqId)?.status === "completed";
    });

    if (allMet) {
      const existing = progressMap.get(row.id);
      if (!existing) {
        db.insert(progress)
          .values({ userId, exerciseId: row.id, status: "available" })
          .run();
      } else if (existing.status === "locked") {
        db.update(progress)
          .set({ status: "available" })
          .where(eq(progress.id, existing.id))
          .run();
      }
    }
  }
}
