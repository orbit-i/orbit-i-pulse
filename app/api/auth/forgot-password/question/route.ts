// app/api/auth/forgot-password/question/route.ts
// Step 1 of self-serve reset (no email provider needed): given an
// email, return that account's security question. Always returns the
// SAME generic message whether or not the email exists, so this can't
// be used to probe which emails are registered.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, security_question")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    if (!user || !user.security_question) {
      return NextResponse.json(
        { error: "We couldn't find an account with that email. Double-check it and try again." },
        { status: 404 }
      );
    }

    return NextResponse.json({ securityQuestion: user.security_question });
  } catch (e: any) {
    return NextResponse.json({ error: `Request failed: ${e.message}` }, { status: 500 });
  }
}
