import { generateSecret as otpGenerateSecret, generateURI, verifySync } from "otplib";

const ISSUER = process.env.TOTP_ISSUER || "DevOps Learning Platform";

export function generateTOTPSecret(): string {
  return otpGenerateSecret();
}

export function getTOTPAuthUri(secret: string, account: string): string {
  return generateURI({
    strategy: "totp",
    issuer: ISSUER,
    label: account,
    secret,
  });
}

export function verifyTOTP(token: string, secret: string): boolean {
  try {
    const result = verifySync({ strategy: "totp", token, secret });
    return (result as { valid: boolean }).valid === true;
  } catch {
    return false;
  }
}
