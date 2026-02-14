import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { users, emailVerificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/auth/audit";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { isSmtpConfigured, sendVerificationEmail } from "@/lib/email";
import { isRegistrationEnabled } from "@/lib/settings";
import { encrypt, hmacHash } from "@/lib/crypto";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  username: z.string().min(2).max(50).optional(),
});

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isRegistrationEnabled()) {
    return NextResponse.json(
      { error: "Registration is disabled" },
      { status: 403 }
    );
  }

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

  // Check if email already exists (by hash)
  const emailH = hmacHash(email);
  const existing = db
    .select()
    .from(users)
    .where(eq(users.emailHash, emailH))
    .get();

  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(password);
  const encryptedEmail = encrypt(email);
  const displayNameValue = username || email.split("@")[0];

  db.insert(users)
    .values({
      id: userId,
      email: encryptedEmail,
      emailHash: emailH,
      passwordHash,
      username: username || email.split("@")[0],
      displayName: encrypt(displayNameValue),
      role: "user",
      createdAt: new Date().toISOString(),
    })
    .run();

  // Send verification email if SMTP is configured
  if (isSmtpConfigured()) {
    const verificationToken = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    db.insert(emailVerificationTokens)
      .values({
        userId,
        token: verificationToken,
        expiresAt: expiresAt.toISOString(),
      })
      .run();

    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (error) {
      console.error("Failed to send verification email:", error);
      // Continue with registration even if email fails
    }
  }

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
