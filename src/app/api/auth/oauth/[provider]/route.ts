import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHmac } from "crypto";
import { cookies } from "next/headers";
import { getBaseUrl, getOAuthGoogleClientId, getOAuthGithubClientId, getOAuthAzureClientId, getOAuthAzureTenant } from "@/lib/settings";

function getProviderAuthURL(
  provider: string,
  state: string
): string | null {
  switch (provider) {
    case "google": {
      const clientId = getOAuthGoogleClientId();
      if (!clientId) return null;
      const callback = `${getBaseUrl()}${process.env.OAUTH_GOOGLE_CALLBACK || "/api/auth/oauth/google/callback"}`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callback,
        response_type: "code",
        scope: "openid email profile",
        state,
        access_type: "offline",
        prompt: "consent",
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }
    case "github": {
      const clientId = getOAuthGithubClientId();
      if (!clientId) return null;
      const callback = `${getBaseUrl()}${process.env.OAUTH_GITHUB_CALLBACK || "/api/auth/oauth/github/callback"}`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callback,
        scope: "user:email",
        state,
      });
      return `https://github.com/login/oauth/authorize?${params}`;
    }
    case "azure": {
      const clientId = getOAuthAzureClientId();
      const tenant = getOAuthAzureTenant();
      if (!clientId) return null;
      const callback = `${getBaseUrl()}${process.env.OAUTH_AZURE_CALLBACK || "/api/auth/oauth/azure/callback"}`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callback,
        response_type: "code",
        scope: "openid email profile",
        state,
        response_mode: "query",
      });
      return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`;
    }
    default:
      return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // Generate state with HMAC for CSRF protection
  const secret =
    process.env.SESSION_SECRET ||
    "dev-secret-change-me-in-production-32chars!!";
  const nonce = randomBytes(16).toString("hex");
  const hmac = createHmac("sha256", secret).update(nonce).digest("hex");
  const state = `${nonce}.${hmac}`;

  // Store state in cookie for verification
  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const authURL = getProviderAuthURL(provider, state);
  if (!authURL) {
    return NextResponse.json(
      { error: `OAuth provider "${provider}" is not configured` },
      { status: 400 }
    );
  }

  return NextResponse.redirect(authURL);
}
