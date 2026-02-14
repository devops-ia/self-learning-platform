import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/auth/session";

// Validate SESSION_SECRET on startup in production
if (process.env.NODE_ENV === "production") {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === "dev-secret-change-me-in-production-32chars!!") {
    console.error(
      "\x1b[31m[SECURITY] SESSION_SECRET is not set or using default value. " +
      "Set a strong, unique SESSION_SECRET environment variable for production.\x1b[0m"
    );
  } else if (secret.length < 32) {
    console.error(
      "\x1b[31m[SECURITY] SESSION_SECRET must be at least 32 characters long.\x1b[0m"
    );
  }
}

const sessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    "dev-secret-change-me-in-production-32chars!!",
  cookieName: "devops-lab-session",
};

/** Add security headers to all responses */
function addSecurityHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  return res;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Add security headers to all matched routes
  addSecurityHeaders(res);

  const path = req.nextUrl.pathname;

  // For non-auth-protected routes, just return with headers
  if (!path.startsWith("/profile") && !path.startsWith("/admin")) {
    return res;
  }

  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  // Protected routes requiring authentication
  if (path.startsWith("/profile")) {
    if (!session.userId) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Admin routes
  if (path.startsWith("/admin")) {
    if (!session.userId) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (session.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/admin/:path*",
    "/modules/:path*",
    "/api/:path*",
    "/",
  ],
};
