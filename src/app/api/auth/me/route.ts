import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function getEnabledProviders(): string[] {
  const providers: string[] = [];
  if (process.env.OAUTH_GOOGLE_CLIENT_ID && process.env.OAUTH_GOOGLE_CLIENT_SECRET) {
    providers.push("google");
  }
  if (process.env.OAUTH_GITHUB_CLIENT_ID && process.env.OAUTH_GITHUB_CLIENT_SECRET) {
    providers.push("github");
  }
  if (process.env.OAUTH_AZURE_CLIENT_ID && process.env.OAUTH_AZURE_CLIENT_SECRET) {
    providers.push("azure");
  }
  return providers;
}

export async function GET() {
  const session = await getSession();
  const oauthProviders = getEnabledProviders();

  if (!session.userId) {
    return NextResponse.json({ user: null, oauthProviders });
  }

  const user = db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      avatarUrl: users.avatarUrl,
      totpEnabled: users.totpEnabled,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .get();

  if (!user) {
    session.destroy();
    return NextResponse.json({ user: null, oauthProviders });
  }

  return NextResponse.json({ user, oauthProviders });
}
