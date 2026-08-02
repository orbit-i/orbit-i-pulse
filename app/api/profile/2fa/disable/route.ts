// app/api/profile/2fa/disable/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  await supabaseAdmin.from("users").update({ two_factor_enabled: false, two_factor_secret: null }).eq("id", session.userId);
  return NextResponse.json({ ok: true });
}
