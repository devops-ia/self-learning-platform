import { Strategy as GitHubStrategy, Profile } from "passport-github2";
import type { OAuthProfile } from "./google";

export function createGitHubStrategy(
  clientId: string,
  clientSecret: string,
  callbackURL: string
) {
  return new GitHubStrategy(
    { clientID: clientId, clientSecret, callbackURL },
    (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: (err: Error | null, user?: OAuthProfile) => void
    ) => {
      done(null, {
        provider: "github",
        providerAccountId: profile.id,
        email: profile.emails?.[0]?.value || null,
        displayName: profile.displayName || profile.username || null,
        avatarUrl: profile.photos?.[0]?.value || null,
      });
    }
  );
}
