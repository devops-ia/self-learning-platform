import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { passkeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logAudit } from "@/lib/auth/audit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const passkeyId = parseInt(id, 10);
  if (isNaN(passkeyId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const passkey = db
    .select()
    .from(passkeys)
    .where(and(eq(passkeys.id, passkeyId), eq(passkeys.userId, auth.userId)))
    .get();

  if (!passkey) {
    return NextResponse.json({ error: "Passkey not found" }, { status: 404 });
  }

  db.delete(passkeys).where(eq(passkeys.id, passkeyId)).run();

  logAudit("passkey_remove", { userId: auth.userId, req });

  return NextResponse.json({ ok: true });
}
