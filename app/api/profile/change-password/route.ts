// app/api/profile/change-password/route.ts
// Lets a signed-in person change their own password (requires their
// current password). Different from /api/auth/forgot-password/*,
// which is for people who are logged OUT and don't remember it.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession, verifyPassword, hashPassword } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both current and new password are required" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("password_hash")
    .eq("id", session.userId)
    .maybeSingle();

  if (error || !user) return NextResponse.json({ error: "Couldn't find your account" }, { status: 404 });

  const correct = await verifyPassword(currentPassword, user.password_hash);
  if (!correct) return NextResponse.json({ error: "Your current password is incorrect" }, { status: 401 });

  const newHash = await hashPassword(newPassword);
  const { error: updateErr } = await supabaseAdmin.from("users").update({ password_hash: newHash }).eq("id", session.userId);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
