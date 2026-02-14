import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { passkeys, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPasskeyAuth } from "@/lib/auth/passkey";
import { logAudit } from "@/lib/auth/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const challenge = session.webauthnChallenge;
  if (!challenge) {
    return NextResponse.json(
      { error: "No pending challenge" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { response } = body;

  // Find the passkey by credential ID
  const credentialId =
    typeof response.id === "string" ? response.id : response.rawId;

  const passkey = db
    .select()
    .from(passkeys)
    .where(eq(passkeys.credentialId, credentialId))
    .get();

  if (!passkey) {
    return NextResponse.json(
      { error: "Passkey not found" },
      { status: 400 }
    );
  }

  try {
    const origin = req.headers.get("origin") || undefined;
    const verification = await verifyPasskeyAuth(response, challenge, passkey, origin);

    if (!verification.verified) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 }
      );
    }

    // Update counter
    db.update(passkeys)
      .set({
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date().toISOString(),
      })
      .where(eq(passkeys.id, passkey.id))
      .run();

    // Get user
    const user = db
      .select()
      .from(users)
      .where(eq(users.id, passkey.userId))
      .get();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Create session
    session.userId = user.id;
    session.role = user.role as "admin" | "user";
    session.email = user.email || undefined;
    session.webauthnChallenge = undefined;
    await session.save();

    logAudit("login", {
      userId: user.id,
      req,
      details: { method: "passkey" },
    });

    return NextResponse.json({
      verified: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error("Passkey auth error:", err);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 400 }
    );
  }
}
