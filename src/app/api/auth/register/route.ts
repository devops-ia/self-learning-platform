import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/auth/audit";
import { checkRateLimit } from "@/lib/auth/rate-limit";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(2).max(50).optional(),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rl = checkRateLimit(`register:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password, username } = parsed.data;

  // Check password policy
  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) {
    return NextResponse.json({ error: pwCheck.error }, { status: 400 });
  }

  // Check if email already exists
  const existing = db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(password);

  db.insert(users)
    .values({
      id: userId,
      email,
      passwordHash,
      username: username || email.split("@")[0],
      displayName: username || email.split("@")[0],
      role: "user",
      createdAt: new Date().toISOString(),
    })
    .run();

  // Create session
  const session = await getSession();
  session.userId = userId;
  session.role = "user";
  session.email = email;
  await session.save();

  logAudit("register", { userId, req });

  return NextResponse.json({
    user: {
      id: userId,
      email,
      username: username || email.split("@")[0],
      role: "user",
    },
  });
}
