// app/api/profile/2fa/enable/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { verifyToken } from "@/lib/twofactor";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { token } = await req.json();
  const { data: user } = await supabaseAdmin.from("users").select("two_factor_secret").eq("id", session.userId).maybeSingle();
  if (!user?.two_factor_secret) return NextResponse.json({ error: "Start setup first." }, { status: 400 });

  if (!verifyToken(token, user.two_factor_secret)) {
    return NextResponse.json({ error: "That code doesn't match. Check your authenticator app and try again." }, { status: 400 });
  }

  await supabaseAdmin.from("users").update({ two_factor_enabled: true }).eq("id", session.userId);
  return NextResponse.json({ ok: true });
}
