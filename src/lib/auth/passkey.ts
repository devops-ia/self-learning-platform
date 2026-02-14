import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import { getBaseUrl } from "@/lib/settings";

type AuthenticatorTransportFuture = "ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb";

const RP_NAME = "DevOps Learning Platform";
const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";

export interface StoredPasskey {
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string | null;
}

export async function generatePasskeyRegistrationOptions(
  userId: string,
  userName: string,
  existingPasskeys: StoredPasskey[]
) {
  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(userId),
    userName,
    attestationType: "none",
    excludeCredentials: existingPasskeys.map((pk) => ({
      id: pk.credentialId,
      transports: pk.transports
        ? (JSON.parse(pk.transports) as AuthenticatorTransportFuture[])
        : undefined,
    })),
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "required",
      userVerification: "preferred",
    },
  });
}

export async function verifyPasskeyRegistration(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any,
  expectedChallenge: string,
  origin?: string
): Promise<VerifiedRegistrationResponse> {
  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin || getBaseUrl(),
    expectedRPID: RP_ID,
  });
}

export async function generatePasskeyAuthOptions() {
  return generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
  });
}

export async function verifyPasskeyAuth(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any,
  expectedChallenge: string,
  passkey: StoredPasskey,
  origin?: string
): Promise<VerifiedAuthenticationResponse> {
  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin || getBaseUrl(),
    expectedRPID: RP_ID,
    credential: {
      id: passkey.credentialId,
      publicKey: Buffer.from(passkey.publicKey, "base64url"),
      counter: passkey.counter,
      transports: passkey.transports
        ? (JSON.parse(passkey.transports) as AuthenticatorTransportFuture[])
        : undefined,
    },
  });
}
