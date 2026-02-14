import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailVerificationTokens, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", req.url));
  }

  // Look up token
  const tokenRecord = db
    .select()
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.token, token))
    .get();

  if (!tokenRecord) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", req.url));
  }

  // Check expiry
  const now = new Date();
  const expiresAt = new Date(tokenRecord.expiresAt);
  if (now > expiresAt) {
    // Clean up expired token
    db.delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.id, tokenRecord.id))
      .run();
    return NextResponse.redirect(new URL("/login?error=token_expired", req.url));
  }

  // Update user
  db.update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, tokenRecord.userId))
    .run();

  // Delete token
  db.delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.id, tokenRecord.id))
    .run();

  return NextResponse.redirect(new URL("/login?verified=true", req.url));
}
