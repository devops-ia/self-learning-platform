import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/auth/audit";
import { checkRateLimit } from "@/lib/auth/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rl = checkRateLimit(`login:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input" },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  const user = db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (!user || !user.passwordHash) {
    logAudit("login_failed", { req, details: { email } });
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    logAudit("login_failed", { userId: user.id, req, details: { email } });
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  // Check if TOTP is enabled — require 2FA step
  if (user.totpEnabled) {
    const session = await getSession();
    session.pendingUserId = user.id;
    await session.save();

    return NextResponse.json({
      requires2FA: true,
      tempToken: randomUUID(), // Not used server-side; session tracks pending state
    });
  }

  // Create full session
  const session = await getSession();
  session.userId = user.id;
  session.role = user.role as "admin" | "user";
  session.email = user.email || undefined;
  await session.save();

  logAudit("login", { userId: user.id, req });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
  });
}
