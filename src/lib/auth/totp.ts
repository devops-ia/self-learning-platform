import { generateSecret as otpGenerateSecret, generateURI, verifySync } from "otplib";
import { getTotpIssuer } from "@/lib/settings";

export function generateTOTPSecret(): string {
  return otpGenerateSecret();
}

export function getTOTPAuthUri(secret: string, account: string): string {
  return generateURI({
    strategy: "totp",
    issuer: getTotpIssuer(),
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
