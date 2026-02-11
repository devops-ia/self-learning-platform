import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { passkeys } from "@/lib/db/schema";
import { verifyPasskeyRegistration } from "@/lib/auth/passkey";
import { logAudit } from "@/lib/auth/audit";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const session = await getSession();
  const challenge = session.webauthnChallenge;
  if (!challenge) {
    return NextResponse.json(
      { error: "No pending challenge" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { response, name } = body;

  try {
    const verification = await verifyPasskeyRegistration(response, challenge);

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 }
      );
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    db.insert(passkeys)
      .values({
        userId: auth.userId,
        credentialId: Buffer.from(credential.id).toString("base64url"),
        publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: credential.transports
          ? JSON.stringify(credential.transports)
          : null,
        name: name || "Passkey",
        createdAt: new Date().toISOString(),
      })
      .run();

    session.webauthnChallenge = undefined;
    await session.save();

    logAudit("passkey_register", { userId: auth.userId, req });

    return NextResponse.json({ verified: true });
  } catch (err) {
    console.error("Passkey registration error:", err);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 400 }
    );
  }
}
