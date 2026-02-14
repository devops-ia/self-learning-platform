import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isSmtpConfigured, sendPasswordResetEmail } from "@/lib/email";
import { hmacHash, safeDecrypt, encrypt } from "@/lib/crypto";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  if (!isSmtpConfigured()) {
    return NextResponse.json(
      { error: "Email service not configured" },
      { status: 503 }
    );
  }

  // Rate limiting
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rl = checkRateLimit(`forgot-password:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email } = parsed.data;

  // Look up user by email_hash (encrypted email architecture)
  const emailH = hmacHash(email);
  const user = db.select().from(users).where(eq(users.emailHash, emailH)).get();

  // Always return success (don't reveal if email exists)
  if (!user) {
    return NextResponse.json({ success: true });
  }

  // Decrypt email for sending the reset email
  const decryptedEmail = safeDecrypt(user.email) || email;

  // Generate token
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Insert token (encrypt token, store email_hash for consistency)
  db.insert(passwordResetTokens)
    .values({
      email: emailH, // Store hash instead of plaintext
      token: encrypt(token), // Encrypt token at rest
      expiresAt: expiresAt.toISOString(),
    })
    .run();

  // Send email
  try {
    await sendPasswordResetEmail(decryptedEmail, token);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    // Still return success to not reveal email existence
  }

  return NextResponse.json({ success: true });
}
