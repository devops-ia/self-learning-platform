import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/auth/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const userId = session.userId;

  if (userId) {
    logAudit("logout", { userId, req });
  }

  session.destroy();

  return NextResponse.json({ ok: true });
}
