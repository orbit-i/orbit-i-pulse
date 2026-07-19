// app/api/auth/forgot-password/question/route.ts
// Step 1 of self-serve reset (no email provider needed): given an
// email + registration number that match the SAME account, return
// that account's security question. Deliberately returns the same
// generic error whether the email doesn't exist or the registration
// number doesn't match it, so this can't be used to probe which
// emails are registered.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeRegistrationNumber } from "@/lib/reg-number";

export async function POST(req: NextRequest) {
  try {
    const { email, registrationNumber } = await req.json();
    if (!email || !registrationNumber) {
      return NextResponse.json({ error: "Email and registration number are required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRegNumber = normalizeRegistrationNumber(registrationNumber);

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, security_question")
      .eq("email", normalizedEmail)
      .eq("registration_number", normalizedRegNumber)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    if (!user || !user.security_question) {
      return NextResponse.json(
        { error: "We couldn't match that email + registration number. Double-check both and try again." },
        { status: 404 }
      );
    }

    return NextResponse.json({ securityQuestion: user.security_question });
  } catch (e: any) {
    return NextResponse.json({ error: `Request failed: ${e.message}` }, { status: 500 });
  }
}
