import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { findOrCreateOAuthUser } from "@/lib/auth/oauth";
import { logAudit } from "@/lib/auth/audit";
import type { OAuthProfile } from "@/lib/auth/passport/google";
import { getBaseUrl, getOAuthGoogleClientId, getOAuthGoogleClientSecret, getOAuthGithubClientId, getOAuthGithubClientSecret, getOAuthAzureClientId, getOAuthAzureClientSecret, getOAuthAzureTenant } from "@/lib/settings";

async function exchangeCodeForProfile(
  provider: string,
  code: string
): Promise<OAuthProfile | null> {
  switch (provider) {
    case "google":
      return exchangeGoogle(code);
    case "github":
      return exchangeGitHub(code);
    case "azure":
      return exchangeAzure(code);
    default:
      return null;
  }
}

async function exchangeGoogle(code: string): Promise<OAuthProfile | null> {
  const baseUrl = getBaseUrl();
  const callback = `${baseUrl}${process.env.OAUTH_GOOGLE_CALLBACK || "/api/auth/oauth/google/callback"}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getOAuthGoogleClientId(),
      client_secret: getOAuthGoogleClientSecret(),
      redirect_uri: callback,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) return null;
  const tokens = await tokenRes.json();

  const userRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  if (!userRes.ok) return null;
  const profile = await userRes.json();

  return {
    provider: "google",
    providerAccountId: profile.id,
    email: profile.email || null,
    displayName: profile.name || null,
    avatarUrl: profile.picture || null,
  };
}

async function exchangeGitHub(code: string): Promise<OAuthProfile | null> {
  const tokenRes = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: getOAuthGithubClientId(),
        client_secret: getOAuthGithubClientSecret(),
        code,
      }),
    }
  );

  if (!tokenRes.ok) return null;
  const tokens = await tokenRes.json();
  if (!tokens.access_token) return null;

  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) return null;
  const profile = await userRes.json();

  // Get primary email
  let email: string | null = profile.email;
  if (!email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (emailsRes.ok) {
      const emails = await emailsRes.json();
      const primary = emails.find(
        (e: { primary: boolean; verified: boolean; email: string }) =>
          e.primary && e.verified
      );
      email = primary?.email || null;
    }
  }

  return {
    provider: "github",
    providerAccountId: String(profile.id),
    email,
    displayName: profile.name || profile.login || null,
    avatarUrl: profile.avatar_url || null,
  };
}

async function exchangeAzure(code: string): Promise<OAuthProfile | null> {
  const tenant = getOAuthAzureTenant();
  const baseUrl = getBaseUrl();
  const callback = `${baseUrl}${process.env.OAUTH_AZURE_CALLBACK || "/api/auth/oauth/azure/callback"}`;

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: getOAuthAzureClientId(),
        client_secret: getOAuthAzureClientSecret(),
        redirect_uri: callback,
        grant_type: "authorization_code",
        scope: "openid email profile",
      }),
    }
  );

  if (!tokenRes.ok) return null;
  const tokens = await tokenRes.json();

  const userRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) return null;
  const profile = await userRes.json();

  return {
    provider: "azure",
    providerAccountId: profile.id,
    email: profile.mail || profile.userPrincipalName || null,
    displayName: profile.displayName || null,
    avatarUrl: null,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = getBaseUrl();

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=oauth_${error}`, baseUrl)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_missing_params", baseUrl)
    );
  }

  // Verify state
  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  cookieStore.delete("oauth_state");

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_state_mismatch", baseUrl)
    );
  }

  const secret =
    process.env.SESSION_SECRET ||
    "dev-secret-change-me-in-production-32chars!!";
  const [nonce, hmac] = state.split(".");
  const expectedHmac = createHmac("sha256", secret)
    .update(nonce)
    .digest("hex");
  if (hmac !== expectedHmac) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_invalid_state", baseUrl)
    );
  }

  // Exchange code for profile
  const profile = await exchangeCodeForProfile(provider, code);
  if (!profile) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_exchange_failed", baseUrl)
    );
  }

  // Find or create user
  const user = findOrCreateOAuthUser(profile);

  // Create session
  const session = await getSession();
  session.userId = user.id;
  session.role = user.role as "admin" | "user";
  session.email = user.email || undefined;
  await session.save();

  logAudit("login", {
    userId: user.id,
    req,
    details: { method: `oauth:${provider}` },
  });
  logAudit("oauth_link", {
    userId: user.id,
    req,
    details: { provider },
  });

  return NextResponse.redirect(new URL("/", baseUrl));
}
