import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { encrypt, hmacHash, safeDecrypt } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const offset = (page - 1) * limit;

  // Fetch all users then filter/search in memory (emails are encrypted)
  const allRows = db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      createdAt: users.createdAt,
      totpEnabled: users.totpEnabled,
      emailVerified: users.emailVerified,
      disabled: users.disabled,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .all();

  // Decrypt emails and displayNames for display
  const decryptedRows = allRows.map((row) => ({
    ...row,
    email: safeDecrypt(row.email),
    displayName: safeDecrypt(row.displayName),
  }));

  // Filter by search term on decrypted email
  const filtered = search
    ? decryptedRows.filter((r) =>
        r.email?.toLowerCase().includes(search.toLowerCase()) ||
        r.username?.toLowerCase().includes(search.toLowerCase())
      )
    : decryptedRows;

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    users: paginated,
    total,
    page,
    limit,
  });
}

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
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

  // Check uniqueness by hash
  const emailH = hmacHash(email);
  const existing = db.select({ id: users.id }).from(users).where(eq(users.emailHash, emailH)).get();
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const userId = randomUUID();
  const displayNameValue = username || email.split("@")[0];

  db.insert(users)
    .values({
      id: userId,
      email: encrypt(email),
      emailHash: emailH,
      passwordHash,
      username: username || email.split("@")[0],
      displayName: encrypt(displayNameValue),
      role,
      createdAt: new Date().toISOString(),
    })
    .run();

  return NextResponse.json({ id: userId, email, role });
}
