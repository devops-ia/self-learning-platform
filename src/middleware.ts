import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/auth/session";

const sessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    "dev-secret-change-me-in-production-32chars!!",
  cookieName: "devops-lab-session",
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  const path = req.nextUrl.pathname;

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
  matcher: ["/profile/:path*", "/admin/:path*"],
};
