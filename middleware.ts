// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { isLicensed } from "@/lib/license";

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
  "/api/license",
];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (!PROTECTED.some((p) => path.startsWith(p))) return NextResponse.next();

  // License check happens FIRST and server-side, so it can't be bypassed
  // by disabling client-side JS or editing the page in devtools. This is
  // a white-label product — every deployment needs its own valid
  // LICENSE_KEY (see lib/license.ts and scripts/generate-license.mjs).
  if (!(await isLicensed())) {
    return path.startsWith("/api")
      ? NextResponse.json({ error: "This deployment does not have a valid license." }, { status: 402 })
      : NextResponse.redirect(new URL("/license-required", req.url));
  }

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
    "/api/license/:path*",
  ],
};
