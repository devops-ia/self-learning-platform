import { createCipheriv, createDecipheriv, randomBytes, createHash, createHmac } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET || "dev-secret-change-me-in-production-32chars!!";
  return createHash("sha256").update(secret).digest();
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns format: iv:authTag:ciphertext (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a string encrypted by encrypt().
 * Returns the original plaintext.
 */
export function decrypt(encrypted: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format");
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Deterministic HMAC-SHA256 hash for email lookups.
 * Same input always produces same output (unlike encrypt which uses random IV).
 */
export function hmacHash(value: string): string {
  const secret = process.env.SESSION_SECRET || "dev-secret-change-me-in-production-32chars!!";
  return createHmac("sha256", secret).update(value.toLowerCase().trim()).digest("hex");
}

/**
 * Safely decrypt, returning the original value if decryption fails
 * (e.g. for unencrypted legacy data).
 */
export function safeDecrypt(value: string | null): string | null {
  if (!value) return null;
  // Check if value looks like encrypted format (hex:hex:hex)
  if (/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/.test(value)) {
    try {
      return decrypt(value);
    } catch {
      return value; // Return as-is if decryption fails
    }
  }
  return value; // Return plaintext as-is
}
