// app/api/auth/register/route.ts
// Open self-registration — no invite code or registration number
// required. Every new account defaults to role "intern". Admins/CEO/
// CTO promote people to other roles later from the Team page
// (see app/api/users/[id]/role/route.ts).
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword, hashSecurityAnswer, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, password, phone, securityQuestion, securityAnswer } = await req.json();

    if (!fullName || !email || !password || !securityQuestion || !securityAnswer) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (securityAnswer.trim().length < 2) {
      return NextResponse.json({ error: "Security answer is too short" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check email not already taken
    const { data: existingUser, error: lookupErr } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (lookupErr) {
      return NextResponse.json(
        { error: `Database error while checking email: ${lookupErr.message}. Run "npm run check-schema" to diagnose.` },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const securityAnswerHash = await hashSecurityAnswer(securityAnswer);

    // First-ever user in the system becomes admin automatically, so a
    // brand-new deployment is usable without a separate bootstrap step.
    // (You can still use scripts/bootstrap-admin.mjs if you prefer to
    // create the admin manually before anyone else signs up.)
    const { count, error: countErr } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true });

    if (countErr) {
      return NextResponse.json(
        { error: `Database error while checking user count: ${countErr.message}. Run "npm run check-schema" to diagnose.` },
        { status: 500 }
      );
    }

    const role = !count || count === 0 ? "admin" : "intern";

    const { data: newUser, error: createErr } = await supabaseAdmin
      .from("users")
      .insert({
        full_name: fullName,
        email: normalizedEmail,
        password_hash: passwordHash,
        phone: phone || null,
        security_question: securityQuestion.trim(),
        security_answer_hash: securityAnswerHash,
        role,
      })
      .select()
      .single();

    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }

    await createSession({ userId: newUser.id, role: newUser.role, email: newUser.email });

    return NextResponse.json({
      user: { id: newUser.id, name: newUser.full_name, role: newUser.role },
    });
  } catch (e: any) {
    // Catches connection failures (unreachable Supabase URL, DNS errors,
    // etc.) instead of letting them surface as an opaque crash.
    return NextResponse.json(
      {
        error: `Registration failed: ${e.message}. This usually means SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY ` +
          `is wrong, or the schema hasn't been run yet. Visit /api/health or run "npm run check-schema" to diagnose.`,
      },
      { status: 500 }
    );
  }
}
