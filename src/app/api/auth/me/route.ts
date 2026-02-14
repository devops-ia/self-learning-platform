import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { safeDecrypt } from "@/lib/crypto";
import { getOAuthGoogleClientId, getOAuthGoogleClientSecret, getOAuthGithubClientId, getOAuthGithubClientSecret, getOAuthAzureClientId, getOAuthAzureClientSecret } from "@/lib/settings";

export const dynamic = "force-dynamic";

function getEnabledProviders(): string[] {
  const providers: string[] = [];
  if (getOAuthGoogleClientId() && getOAuthGoogleClientSecret()) {
    providers.push("google");
  }
  if (getOAuthGithubClientId() && getOAuthGithubClientSecret()) {
    providers.push("github");
  }
  if (getOAuthAzureClientId() && getOAuthAzureClientSecret()) {
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
      preferences: users.preferences,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .get();

  if (!user) {
    session.destroy();
    return NextResponse.json({ user: null, oauthProviders });
  }

  return NextResponse.json({
    user: {
      ...user,
      email: safeDecrypt(user.email),
      displayName: safeDecrypt(user.displayName),
    },
    oauthProviders,
  });
}
