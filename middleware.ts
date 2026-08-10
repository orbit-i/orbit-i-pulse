// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED = [
  "/dashboard",
  "/api/attendance",
  "/api/reports",
  "/api/users",
  "/api/tasks",
  "/api/leave",
  "/api/departments",
  "/api/teams",
  "/api/documents",
  "/api/profile",
  "/api/announcements",
  "/api/org-chart",
  "/api/settings",
  "/api/messages",
  "/api/analytics",
  "/api/search",
  "/api/notifications",
  "/api/backup",
  "/api/audit-log",
];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (!PROTECTED.some((p) => path.startsWith(p))) return NextResponse.next();

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // In dev without env vars: redirect to login cleanly
    return path.startsWith("/api")
      ? NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
      : NextResponse.redirect(new URL("/login", req.url));
  }

  const token = req.cookies.get("session_token")?.value;
  if (!token) {
    return path.startsWith("/api")
      ? NextResponse.json({ error: "Unauthenticated" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch {
    return path.startsWith("/api")
      ? NextResponse.json({ error: "Session expired" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/attendance/:path*",
    "/api/reports/:path*",
    "/api/users/:path*",
    "/api/tasks/:path*",
    "/api/leave/:path*",
    "/api/departments/:path*",
    "/api/teams/:path*",
    "/api/documents/:path*",
    "/api/profile/:path*",
    "/api/announcements/:path*",
    "/api/org-chart/:path*",
    "/api/settings/:path*",
    "/api/messages/:path*",
    "/api/analytics/:path*",
    "/api/search/:path*",
    "/api/notifications/:path*",
    "/api/backup/:path*",
    "/api/audit-log/:path*",
  ],
};
