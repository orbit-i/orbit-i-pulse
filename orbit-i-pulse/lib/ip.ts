// lib/ip.ts
import { NextRequest } from "next/server";

// Vercel sets x-forwarded-for on every request; this handles
// proxied requests correctly and falls back gracefully.
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
