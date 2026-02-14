/**
 * CSRF Protection
 *
 * Implements double-submit cookie pattern with signed tokens
 */

import { randomBytes, createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "./session";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate a CSRF token for the current session
 */
export async function generateCsrfToken(): Promise<string> {
  const session = await getSession();

  // Generate random token if not exists
  if (!session.userId) {
    // For anonymous users, generate a random token
    return randomBytes(32).toString("hex");
  }

  // For authenticated users, create a signed token with userId
  const secret =
    process.env.SESSION_SECRET ||
    "dev-secret-change-me-in-production-32chars!!";
  const timestamp = Date.now().toString();
  const data = `${session.userId}:${timestamp}`;
  const signature = createHmac("sha256", secret).update(data).digest("hex");

  return `${data}:${signature}`;
}

/**
 * Set CSRF token in response cookie (double-submit pattern)
 */
export function setCsrfCookie(res: NextResponse, token: string): void {
  res.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });
}

/**
 * Verify CSRF token from request (double-submit cookie pattern)
 */
export async function verifyCsrfToken(req: NextRequest): Promise<boolean> {
  const session = await getSession();

  // Get token from both header and cookie
  const headerToken = req.headers.get(CSRF_HEADER_NAME);
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;

  // Both must be present
  if (!headerToken || !cookieToken) {
    return false;
  }

  // Tokens must match (double-submit pattern)
  if (headerToken !== cookieToken) {
    return false;
  }

  // For anonymous users, matching tokens is sufficient
  if (!session.userId) {
    return true;
  }

  // For authenticated users, verify signature
  const parts = headerToken.split(":");
  if (parts.length !== 3) {
    return false;
  }

  const [userId, timestamp, signature] = parts;

  // Verify userId matches session
  if (userId !== session.userId) {
    return false;
  }

  // Verify token is not too old (1 hour)
  const tokenAge = Date.now() - parseInt(timestamp, 10);
  if (tokenAge > 60 * 60 * 1000) {
    return false;
  }

  // Verify signature
  const secret =
    process.env.SESSION_SECRET ||
    "dev-secret-change-me-in-production-32chars!!";
  const data = `${userId}:${timestamp}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(data)
    .digest("hex");

  return signature === expectedSignature;
}

/**
 * Check if request requires CSRF protection
 */
export function requiresCsrfProtection(req: NextRequest): boolean {
  const method = req.method.toUpperCase();
  const path = req.nextUrl.pathname;

  // Only protect state-changing methods
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return false;
  }

  // Exempt OAuth callback routes (they use state parameter instead)
  if (path.includes("/api/auth/oauth/")) {
    return false;
  }

  // Protect all other API routes
  return path.startsWith("/api/");
}

/**
 * Middleware helper to verify CSRF token
 */
export async function checkCsrf(
  req: NextRequest
): Promise<{ valid: boolean; error?: string }> {
  if (!requiresCsrfProtection(req)) {
    return { valid: true };
  }

  const isValid = await verifyCsrfToken(req);
  if (!isValid) {
    return { valid: false, error: "Invalid or missing CSRF token" };
  }

  return { valid: true };
}
