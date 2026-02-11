import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth/audit";

const disableSchema = z.object({
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = disableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const user = db
    .select()
    .from(users)
    .where(eq(users.id, auth.userId))
    .get();

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid password" },
      { status: 401 }
    );
  }

  db.update(users)
    .set({
      totpSecret: null,
      totpEnabled: false,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, auth.userId))
    .run();

  logAudit("totp_disable", { userId: auth.userId, req });

  return NextResponse.json({ disabled: true });
}
