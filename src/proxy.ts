import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/auth/session";

// Validate SESSION_SECRET on startup in production
if (process.env.NODE_ENV === "production") {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === "dev-secret-change-me-in-production-32chars!!") {
    const errorMsg = "[SECURITY FATAL] SESSION_SECRET is not set or using default value. " +
      "Set a strong, unique SESSION_SECRET environment variable for production.";
    console.error("\x1b[31m" + errorMsg + "\x1b[0m");
    throw new Error(errorMsg);
  } else if (secret.length < 32) {
    const errorMsg = "[SECURITY FATAL] SESSION_SECRET must be at least 32 characters long.";
    console.error("\x1b[31m" + errorMsg + "\x1b[0m");
    throw new Error(errorMsg);
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
  // In development/test, Next.js requires 'unsafe-inline' for hydration scripts
  const isProd = process.env.NODE_ENV === "production";
  const cspDirectives = [
    "default-src 'self'",
    isProd
      ? "script-src 'self' 'unsafe-eval'" // Production: strict CSP
      : "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Dev/Test: allow inline scripts for Next.js hydration
    "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for Tailwind and component styles
    "img-src 'self' data: https:", // data: for base64 images, https: for avatars
    "font-src 'self' data:",
    isProd ? "connect-src 'self'" : "connect-src 'self' ws: wss:", // Dev: allow webpack HMR websockets
    "frame-ancestors 'none'", // Same as X-Frame-Options: DENY
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];

  // Only add upgrade-insecure-requests and HSTS in production
  if (isProd) {
    cspDirectives.push("upgrade-insecure-requests");
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  res.headers.set("Content-Security-Policy", cspDirectives.join("; "));

  return res;
}

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  // Add security headers to all matched routes
  addSecurityHeaders(res);

  // CSRF protection (opt-in via env var for gradual rollout)
  if (process.env.CSRF_PROTECTION_ENABLED === "true") {
    // Dynamic import to avoid loading crypto in Edge Runtime during build
    const { checkCsrf } = await import("@/lib/auth/csrf");
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
