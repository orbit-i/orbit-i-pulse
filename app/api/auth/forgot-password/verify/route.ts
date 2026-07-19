// app/api/auth/forgot-password/verify/route.ts
// Step 2 of self-serve reset: check the security answer. On success,
// issue a short-lived (10 min) reset token the client will send to
// /reset along with the new password. Never reveals a session cookie
// here — answering the question correctly is not the same as logging in.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySecurityAnswer, createResetToken } from "@/lib/auth";
import { normalizeRegistrationNumber } from "@/lib/reg-number";

export async function POST(req: NextRequest) {
  try {
    const { email, registrationNumber, securityAnswer } = await req.json();
    if (!email || !registrationNumber || !securityAnswer) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRegNumber = normalizeRegistrationNumber(registrationNumber);

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, security_answer_hash")
      .eq("email", normalizedEmail)
      .eq("registration_number", normalizedRegNumber)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    if (!user || !user.security_answer_hash) {
      return NextResponse.json({ error: "Verification failed. Please start over." }, { status: 404 });
    }

    const correct = await verifySecurityAnswer(securityAnswer, user.security_answer_hash);
    if (!correct) {
      return NextResponse.json({ error: "That answer doesn't match our records." }, { status: 401 });
    }

    const resetToken = await createResetToken(user.id);
    return NextResponse.json({ resetToken });
  } catch (e: any) {
    return NextResponse.json({ error: `Request failed: ${e.message}` }, { status: 500 });
  }
}
