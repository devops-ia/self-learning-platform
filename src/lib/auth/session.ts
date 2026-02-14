import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSessionTTL } from "@/lib/settings";

export interface SessionData {
  userId?: string;
  role?: "admin" | "user" | "anonymous";
  email?: string;
  // Temporary token for 2FA flow
  pendingUserId?: string;
  // WebAuthn challenge
  webauthnChallenge?: string;
  // Pending TOTP secret during setup
  pendingTotpSecret?: string;
}

function getSessionOptions() {
  return {
    password:
      process.env.SESSION_SECRET ||
      "dev-secret-change-me-in-production-32chars!!",
    cookieName: "devops-lab-session",
    ttl: getSessionTTL(),
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}

export async function getSessionFromRequest(
  req: NextRequest,
  res: NextResponse
): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(req, res, getSessionOptions());
}

/** Get the current authenticated user ID, or null */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session.userId || null;
}

/** Require authentication — returns user info or 401 response */
export async function requireAuth(): Promise<
  | { userId: string; role: string; error?: never }
  | { error: NextResponse; userId?: never; role?: never }
> {
  const session = await getSession();
  if (!session.userId) {
    return {
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  return { userId: session.userId, role: session.role || "user" };
}

/** Require admin role — returns user info or 401/403 response */
export async function requireAdmin(): Promise<
  | { userId: string; role: string; error?: never }
  | { error: NextResponse; userId?: never; role?: never }
> {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (auth.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      ),
    };
  }
  return auth;
}
