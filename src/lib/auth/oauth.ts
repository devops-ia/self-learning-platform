import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { users, oauthAccounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { OAuthProfile } from "./passport/google";

/**
 * Find or create a user from an OAuth profile.
 * Links the OAuth account to an existing user if one with the same email exists.
 */
export function findOrCreateOAuthUser(profile: OAuthProfile): {
  id: string;
  role: string;
  email: string | null;
} {
  // Check if this OAuth account already exists
  const existingAccount = db
    .select()
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.provider, profile.provider),
        eq(oauthAccounts.providerAccountId, profile.providerAccountId)
      )
    )
    .get();

  if (existingAccount) {
    const user = db
      .select()
      .from(users)
      .where(eq(users.id, existingAccount.userId))
      .get();

    if (user) {
      return { id: user.id, role: user.role, email: user.email };
    }
  }

  // Check if a user with the same email exists
  let userId: string;
  let role: string;

  if (profile.email) {
    const existingUser = db
      .select()
      .from(users)
      .where(eq(users.email, profile.email))
      .get();

    if (existingUser) {
      userId = existingUser.id;
      role = existingUser.role;
    } else {
      userId = randomUUID();
      role = "user";
      db.insert(users)
        .values({
          id: userId,
          email: profile.email,
          username: profile.displayName || profile.email.split("@")[0],
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          role: "user",
          emailVerified: true,
          createdAt: new Date().toISOString(),
        })
        .run();
    }
  } else {
    userId = randomUUID();
    role = "user";
    db.insert(users)
      .values({
        id: userId,
        username: profile.displayName || "user",
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        role: "user",
        createdAt: new Date().toISOString(),
      })
      .run();
  }

  // Link OAuth account
  if (!existingAccount) {
    db.insert(oauthAccounts)
      .values({
        userId,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
        createdAt: new Date().toISOString(),
      })
      .run();
  }

  return { id: userId, role, email: profile.email };
}
