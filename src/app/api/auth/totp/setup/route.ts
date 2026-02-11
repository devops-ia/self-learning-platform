import { NextResponse } from "next/server";
import { requireAuth, getSession } from "@/lib/auth/session";
import { generateTOTPSecret, getTOTPAuthUri } from "@/lib/auth/totp";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";

export async function POST() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const user = db
    .select()
    .from(users)
    .where(eq(users.id, auth.userId))
    .get();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.totpEnabled) {
    return NextResponse.json(
      { error: "2FA is already enabled" },
      { status: 400 }
    );
  }

  const secret = generateTOTPSecret();
  const uri = getTOTPAuthUri(secret, user.email || user.username);
  const qrCode = await QRCode.toDataURL(uri);

  // Store secret temporarily in session (not in DB until verified)
  const session = await getSession();
  session.pendingTotpSecret = secret;
  await session.save();

  return NextResponse.json({ qrCode, secret, uri });
}
