declare module "passport-microsoft" {
  import { Strategy } from "passport";

  interface OIDCStrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    tenant?: string;
    scope?: string[];
    responseType?: string;
    responseMode?: string;
  }

  type VerifyCallback = (
    iss: string,
    sub: string,
    profile: {
      id: string;
      displayName?: string;
      emails?: { value: string }[];
      _json?: Record<string, unknown>;
    },
    accessToken: string,
    refreshToken: string,
    done: (err: Error | null, user?: unknown) => void
  ) => void;

  export class OIDCStrategy extends Strategy {
    constructor(options: OIDCStrategyOptions, verify: VerifyCallback);
  }
}
