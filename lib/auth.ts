// lib/auth.ts
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { Role } from "./roles";

// Local JWT auth — no third-party identity provider.
// JWT_SECRET must be set in .env.local (dev) or Vercel env vars (prod).
// Generate one: openssl rand -base64 32

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Missing JWT_SECRET — set it in .env.local or Vercel env vars.");
  return new TextEncoder().encode(s);
}

const COOKIE_NAME = "session_token";

export type SessionPayload = {
  userId: string;
  role: Role;
  email: string;
};

// --- Password hashing ---
export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}
export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

// --- Security-answer hashing (self-serve password reset, no email needed) ---
// Answers are normalized (lowercase, trimmed) before hashing so reset
// isn't broken by capitalization or stray whitespace differences.
export async function hashSecurityAnswer(plain: string) {
  return bcrypt.hash(plain.trim().toLowerCase(), 12);
}
export async function verifySecurityAnswer(plain: string, hash: string) {
  return bcrypt.compare(plain.trim().toLowerCase(), hash);
}

// --- JWT issuing ---
export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}

// --- JWT verification ---
export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// --- Role guard for API routes ---
export async function requireRole(...allowed: SessionPayload["role"][]) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  if (!allowed.includes(session.role)) throw new Error("FORBIDDEN");
  return session;
}

// --- Session + full name ---
export async function getCurrentUserProfile() {
  const session = await getSession();
  if (!session) return null;
  const { supabaseAdmin } = await import("./supabase");
  const { data } = await supabaseAdmin
    .from("users")
    .select("full_name")
    .eq("id", session.userId)
    .maybeSingle();
  return { ...session, fullName: data?.full_name || session.email };
}

// --- Self-serve password reset tokens ---
// Short-lived (10 min), single-purpose JWT proving the person already
// answered their security question correctly. Kept separate from the
// session cookie/token so a reset token can never be reused to log in,
// and a login session can never be used to reset someone else's password.
const RESET_PURPOSE = "password_reset";

export async function createResetToken(userId: string) {
  return new SignJWT({ userId, purpose: RESET_PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getSecret());
}

export async function verifyResetToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== RESET_PURPOSE || typeof payload.userId !== "string") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
