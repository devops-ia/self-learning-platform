import { OIDCStrategy } from "passport-microsoft";
import type { OAuthProfile } from "./google";

export function createAzureStrategy(
  clientId: string,
  clientSecret: string,
  tenant: string,
  callbackURL: string
) {
  return new OIDCStrategy(
    {
      clientID: clientId,
      clientSecret,
      callbackURL,
      tenant,
      scope: ["openid", "profile", "email"],
      responseType: "code",
      responseMode: "query",
    },
    (
      _iss: string,
      _sub: string,
      profile: { id: string; displayName?: string; emails?: { value: string }[]; _json?: { photo?: string } },
      _accessToken: string,
      _refreshToken: string,
      done: (err: Error | null, user?: OAuthProfile) => void
    ) => {
      done(null, {
        provider: "azure",
        providerAccountId: profile.id,
        email: profile.emails?.[0]?.value || null,
        displayName: profile.displayName || null,
        avatarUrl: profile._json?.photo || null,
      });
    }
  );
}
