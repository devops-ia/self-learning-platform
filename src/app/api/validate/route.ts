import { NextRequest, NextResponse } from "next/server";
import { validateExercise } from "@/lib/validators/engine";
import { exercises as allExercises } from "@/lib/exercises";
import { db } from "@/lib/db";
import { users, submissions, progress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { exerciseId, code, failureCount = 0, userId } = body;

  if (!exerciseId || !code) {
    return NextResponse.json(
      { error: "exerciseId and code are required" },
      { status: 400 }
    );
  }

  const result = validateExercise(exerciseId, code, failureCount);

  // Store submission if we have a userId
  if (userId) {
    try {
      // Ensure user exists
      const existingUser = db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .get();

      if (!existingUser) {
        db.insert(users)
          .values({ id: userId, username: "anonymous", createdAt: new Date().toISOString() })
          .run();
      }

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
  for (const [id, exercise] of Object.entries(allExercises)) {
    const ex = exercise as { prerequisites: string[] };
    if (ex.prerequisites.includes(completedExerciseId)) {
      // Check if all prerequisites are met
      const allMet = ex.prerequisites.every((prereqId: string) => {
        const prereqProgress = db
          .select()
          .from(progress)
          .where(and(eq(progress.userId, userId), eq(progress.exerciseId, prereqId)))
          .get();
        return prereqProgress?.status === "completed";
      });

      if (allMet) {
        const existing = db
          .select()
          .from(progress)
          .where(and(eq(progress.userId, userId), eq(progress.exerciseId, id)))
          .get();

        if (!existing) {
          db.insert(progress)
            .values({ userId, exerciseId: id, status: "available" })
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
}
