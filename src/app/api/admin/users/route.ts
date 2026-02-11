import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { like, desc, sql } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const offset = (page - 1) * limit;

  let query = db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      createdAt: users.createdAt,
      totpEnabled: users.totpEnabled,
      emailVerified: users.emailVerified,
    })
    .from(users);

  if (search) {
    query = query.where(
      like(users.email, `%${search}%`)
    ) as typeof query;
  }

  const rows = query
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const total = db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .get();

  return NextResponse.json({
    users: rows,
    total: total?.count || 0,
    page,
    limit,
  });
}

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(2).max(50).optional(),
  role: z.enum(["admin", "user"]).default("user"),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password, username, role } = parsed.data;
  const passwordHash = await hashPassword(password);
  const userId = randomUUID();

  db.insert(users)
    .values({
      id: userId,
      email,
      passwordHash,
      username: username || email.split("@")[0],
      displayName: username || email.split("@")[0],
      role,
      createdAt: new Date().toISOString(),
    })
    .run();

  return NextResponse.json({ id: userId, email, role });
}
