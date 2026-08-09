// app/api/auth/forgot-password/reset/route.ts
// Step 3: spend the short-lived reset token to actually set a new
// password. The token can only be used once in spirit — it expires
// in 10 minutes and is never reused for anything else.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyResetToken, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { resetToken, newPassword } = await req.json();
    if (!resetToken || !newPassword) {
      return NextResponse.json({ error: "Reset token and new password are required" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const payload = await verifyResetToken(resetToken);
    if (!payload) {
      return NextResponse.json({ error: "This reset link has expired. Please start over." }, { status: 401 });
    }

    const passwordHash = await hashPassword(newPassword);
    const { error } = await supabaseAdmin
      .from("users")
      .update({ password_hash: passwordHash })
      .eq("id", payload.userId);

    if (error) {
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: `Request failed: ${e.message}` }, { status: 500 });
  }
}
