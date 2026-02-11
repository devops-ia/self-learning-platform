import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { passkeys } from "@/lib/db/schema";
import { generatePasskeyAuthOptions } from "@/lib/auth/passkey";

export async function POST() {
  // For passkey auth, we allow all registered passkeys (discoverable credentials)
  const allPasskeys = db.select().from(passkeys).all();

  const options = await generatePasskeyAuthOptions(allPasskeys);

  const session = await getSession();
  session.webauthnChallenge = options.challenge;
  await session.save();

  return NextResponse.json(options);
}
