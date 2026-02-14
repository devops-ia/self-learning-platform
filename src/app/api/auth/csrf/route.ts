import { NextResponse } from "next/server";
import { generateCsrfToken, setCsrfCookie } from "@/lib/auth/csrf";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/csrf
 * Returns a CSRF token for the current session
 * Sets token in cookie for double-submit pattern
 */
export async function GET() {
  const token = await generateCsrfToken();
  const response = NextResponse.json({ csrfToken: token });

  // Set token in cookie for double-submit pattern
  setCsrfCookie(response, token);

  return response;
}
