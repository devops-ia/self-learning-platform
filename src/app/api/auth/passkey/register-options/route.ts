import { NextResponse } from "next/server";
import { requireAuth, getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users, passkeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generatePasskeyRegistrationOptions } from "@/lib/auth/passkey";

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

  const existingPasskeys = db
    .select()
    .from(passkeys)
    .where(eq(passkeys.userId, auth.userId))
    .all();

  const options = await generatePasskeyRegistrationOptions(
    user.id,
    user.email || user.username,
    existingPasskeys
  );

  const session = await getSession();
  session.webauthnChallenge = options.challenge;
  await session.save();

  return NextResponse.json(options);
}
