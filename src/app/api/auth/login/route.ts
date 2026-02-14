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
import { hmacHash, safeDecrypt } from "@/lib/crypto";

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

  // Lookup by email_hash (encrypted) first, fall back to plaintext for legacy
  const emailH = hmacHash(email);
  let user = db
    .select()
    .from(users)
    .where(eq(users.emailHash, emailH))
    .get();

  if (!user) {
    // Fallback: try plaintext email for unencrypted legacy data
    user = db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();
  }

  if (!user || !user.passwordHash) {
    logAudit("login_failed", { req, details: { email } });
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  if (user.disabled) {
    return NextResponse.json({ error: "Account disabled" }, { status: 403 });
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
      tempToken: randomUUID(),
    });
  }

  // Create full session
  const decryptedEmail = safeDecrypt(user.email);
  const session = await getSession();
  session.userId = user.id;
  session.role = user.role as "admin" | "user";
  session.email = decryptedEmail || undefined;
  await session.save();

  logAudit("login", { userId: user.id, req });

  return NextResponse.json({
    user: {
      id: user.id,
      email: decryptedEmail,
      username: user.username,
      displayName: safeDecrypt(user.displayName),
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
  });
}
