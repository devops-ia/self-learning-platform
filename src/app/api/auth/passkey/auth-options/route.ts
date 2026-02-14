import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { generatePasskeyAuthOptions } from "@/lib/auth/passkey";

export async function POST() {
  // Empty allowCredentials lets the browser discover platform credentials (Touch ID)
  const options = await generatePasskeyAuthOptions();

  const session = await getSession();
  session.webauthnChallenge = options.challenge;
  await session.save();

  return NextResponse.json(options);
}
