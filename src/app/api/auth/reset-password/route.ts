import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import argon2 from "argon2";
import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { validatePassword } from "@/lib/auth/password";
import { encrypt } from "@/lib/crypto";

export const dynamic = "force-dynamic";

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(12),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, newPassword } = parsed.data;

  // Check password policy
  const pwCheck = validatePassword(newPassword);
  if (!pwCheck.valid) {
    return NextResponse.json({ error: pwCheck.error }, { status: 400 });
  }

  // Encrypt token for lookup (tokens are stored encrypted)
  const encryptedToken = encrypt(token);

  // Look up token
  const tokenRecord = db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, encryptedToken),
        eq(passwordResetTokens.used, false)
      )
    )
    .get();

  if (!tokenRecord) {
    return NextResponse.json(
      { error: "Invalid or already used token" },
      { status: 400 }
    );
  }

  // Check expiry
  const now = new Date();
  const expiresAt = new Date(tokenRecord.expiresAt);
  if (now > expiresAt) {
    return NextResponse.json(
      { error: "Token expired" },
      { status: 400 }
    );
  }

  // Hash new password
  const passwordHash = await argon2.hash(newPassword, {
    type: 2, // argon2id
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  // Update user password (email field now contains email_hash)
  db.update(users)
    .set({ passwordHash })
    .where(eq(users.emailHash, tokenRecord.email))
    .run();

  // Mark token as used
  db.update(passwordResetTokens)
    .set({ used: true })
    .where(eq(passwordResetTokens.id, tokenRecord.id))
    .run();

  return NextResponse.json({ success: true });
}
