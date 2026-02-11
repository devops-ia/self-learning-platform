import { db } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export function checkRateLimit(key: string): {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
} {
  const now = new Date();
  const existing = db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .get();

  if (!existing) {
    db.insert(rateLimits)
      .values({
        key,
        attempts: 1,
        windowStart: now.toISOString(),
      })
      .run();
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
      resetAt: new Date(now.getTime() + WINDOW_MS),
    };
  }

  const windowStart = new Date(existing.windowStart);
  const elapsed = now.getTime() - windowStart.getTime();

  // Window expired — reset
  if (elapsed > WINDOW_MS) {
    db.update(rateLimits)
      .set({ attempts: 1, windowStart: now.toISOString() })
      .where(eq(rateLimits.id, existing.id))
      .run();
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
      resetAt: new Date(now.getTime() + WINDOW_MS),
    };
  }

  // Within window
  const attempts = existing.attempts + 1;
  db.update(rateLimits)
    .set({ attempts })
    .where(eq(rateLimits.id, existing.id))
    .run();

  return {
    allowed: attempts <= MAX_ATTEMPTS,
    remaining: Math.max(0, MAX_ATTEMPTS - attempts),
    resetAt: new Date(windowStart.getTime() + WINDOW_MS),
  };
}
