import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/auth/session";
import { checkCsrf } from "@/lib/auth/csrf";

// Validate SESSION_SECRET on startup in production
if (process.env.NODE_ENV === "production") {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === "dev-secret-change-me-in-production-32chars!!") {
    console.error(
      "\x1b[31m[SECURITY FATAL] SESSION_SECRET is not set or using default value.\x1b[0m"
    );
    console.error(
      "\x1b[31mSet a strong, unique SESSION_SECRET environment variable for production.\x1b[0m"
    );
    process.exit(1); // Fail startup in production
  } else if (secret.length < 32) {
    console.error(
      "\x1b[31m[SECURITY FATAL] SESSION_SECRET must be at least 32 characters long.\x1b[0m"
    );
    process.exit(1); // Fail startup in production
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
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Content Security Policy
  // Note: 'unsafe-eval' required for Monaco Editor, 'unsafe-inline' for styles
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval'", // unsafe-eval needed for Monaco Editor
    "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for Tailwind and component styles
    "img-src 'self' data: https:", // data: for base64 images, https: for avatars
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'", // Same as X-Frame-Options: DENY
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ];

  // Only add HSTS in production with HTTPS
  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  res.headers.set("Content-Security-Policy", cspDirectives.join("; "));

  return res;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Add security headers to all matched routes
  addSecurityHeaders(res);

  // CSRF protection (opt-in via env var for gradual rollout)
  if (process.env.CSRF_PROTECTION_ENABLED === "true") {
    const csrfCheck = await checkCsrf(req);
    if (!csrfCheck.valid) {
      return NextResponse.json(
        { error: csrfCheck.error || "CSRF validation failed" },
        { status: 403 }
      );
    }
  }

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
