import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { desc, like, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const offset = (page - 1) * limit;

  let query = db.select().from(auditLog);

  if (action) {
    query = query.where(like(auditLog.action, `%${action}%`)) as typeof query;
  }

  const rows = query
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const total = db
    .select({ count: sql<number>`count(*)` })
    .from(auditLog)
    .get();

  return NextResponse.json({
    entries: rows,
    total: total?.count || 0,
    page,
    limit,
  });
}
