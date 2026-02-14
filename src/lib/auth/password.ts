import argon2 from "argon2";

// OWASP recommended parameters for argon2id
const ARGON2_OPTIONS = {
  type: 2 as const, // argon2id
  memoryCost: 19456, // 19 MB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

// Simple password policy: min 8 chars
const COMMON_PASSWORDS = new Set([
  "password",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "password1",
  "iloveyou",
  "admin123",
  "welcome1",
  "monkey123",
  "dragon12",
  "master12",
  "letmein1",
  "abc12345",
  "football1",
  "shadow12",
  "michael1",
  "qwertyui",
  "superman1",
  "trustno1",
]);

export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  // Minimum length: 12 characters
  if (password.length < 12) {
    return { valid: false, error: "Password must be at least 12 characters" };
  }

  // Check for common passwords
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, error: "Password is too common" };
  }

  // Require at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }

  // Require at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }

  // Require at least one number
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }

  // Require at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character (!@#$%^&*...)" };
  }

  return { valid: true };
}
