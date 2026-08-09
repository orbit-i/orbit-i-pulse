// app/api/auth/verify-2fa/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createSession, verifyTwoFactorPendingToken } from "@/lib/auth";
import { verifyToken } from "@/lib/twofactor";

export async function POST(req: NextRequest) {
  const { pendingToken, code } = await req.json();
  if (!pendingToken || !code) return NextResponse.json({ error: "Code is required" }, { status: 400 });

  const pending = await verifyTwoFactorPendingToken(pendingToken);
  if (!pending) return NextResponse.json({ error: "Your session expired — log in again." }, { status: 401 });

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, email, role, full_name, two_factor_secret")
    .eq("id", pending.userId)
    .maybeSingle();

  if (!user?.two_factor_secret || !verifyToken(code, user.two_factor_secret)) {
    return NextResponse.json({ error: "Incorrect code. Try again." }, { status: 401 });
  }

  await createSession({ userId: user.id, role: user.role, email: user.email });
  return NextResponse.json({ user: { id: user.id, name: user.full_name, role: user.role } });
}
