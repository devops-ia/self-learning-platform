import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isSmtpConfigured, sendPasswordResetEmail } from "@/lib/email";

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

  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email } = parsed.data;

  // Look up user
  const user = db.select().from(users).where(eq(users.email, email)).get();

  // Always return success (don't reveal if email exists)
  if (!user) {
    return NextResponse.json({ success: true });
  }

  // Generate token
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Insert token
  db.insert(passwordResetTokens)
    .values({
      email,
      token,
      expiresAt: expiresAt.toISOString(),
    })
    .run();

  // Send email
  try {
    await sendPasswordResetEmail(email, token);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    // Still return success to not reveal email existence
  }

  return NextResponse.json({ success: true });
}
