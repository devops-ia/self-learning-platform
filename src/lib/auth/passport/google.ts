import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";

export function createGoogleStrategy(
  clientId: string,
  clientSecret: string,
  callbackURL: string
) {
  return new GoogleStrategy(
    { clientID: clientId, clientSecret, callbackURL },
    (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: (err: Error | null, user?: OAuthProfile) => void
    ) => {
      done(null, {
        provider: "google",
        providerAccountId: profile.id,
        email: profile.emails?.[0]?.value || null,
        displayName: profile.displayName || null,
        avatarUrl: profile.photos?.[0]?.value || null,
      });
    }
  );
}

export interface OAuthProfile {
  provider: string;
  providerAccountId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}
