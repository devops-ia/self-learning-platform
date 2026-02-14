import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { verifyTOTP } from "@/lib/auth/totp";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth/audit";
import { encrypt, safeDecrypt } from "@/lib/crypto";

const verifySchema = z.object({
  code: z.string().length(6),
  isLogin: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { code, isLogin } = parsed.data;
  const session = await getSession();

  // Login flow: verify TOTP for pending user
  if (isLogin) {
    const pendingUserId = session.pendingUserId;
    if (!pendingUserId) {
      return NextResponse.json(
        { error: "No pending 2FA verification" },
        { status: 400 }
      );
    }

    const user = db
      .select()
      .from(users)
      .where(eq(users.id, pendingUserId))
      .get();

    if (!user || !user.totpSecret) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Decrypt TOTP secret
    const decryptedSecret = safeDecrypt(user.totpSecret);
    if (!decryptedSecret) {
      return NextResponse.json({ error: "Invalid TOTP configuration" }, { status: 500 });
    }

    const valid = verifyTOTP(code, decryptedSecret);
    if (!valid) {
      return NextResponse.json({ error: "Invalid code" }, { status: 401 });
    }

    // Complete login
    session.userId = user.id;
    session.role = user.role as "admin" | "user";
    session.email = user.email || undefined;
    session.pendingUserId = undefined;
    await session.save();

    logAudit("login", {
      userId: user.id,
      req,
      details: { method: "totp" },
    });

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

  // Setup flow: verify TOTP and enable it
  if (!session.userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const pendingSecret = session.pendingTotpSecret;
  if (!pendingSecret) {
    return NextResponse.json(
      { error: "No pending TOTP setup. Call /api/auth/totp/setup first." },
      { status: 400 }
    );
  }

  const valid = verifyTOTP(code, pendingSecret);
  if (!valid) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  // Save to DB (encrypt TOTP secret)
  db.update(users)
    .set({
      totpSecret: encrypt(pendingSecret),
      totpEnabled: true,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, session.userId))
    .run();

  // Clear pending secret
  session.pendingTotpSecret = undefined;
  await session.save();

  logAudit("totp_enable", { userId: session.userId, req });

  return NextResponse.json({ enabled: true });
}
