// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, email, password_hash, role, is_active, full_name")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    // Distinguish "database unreachable / misconfigured" from "no such
    // user" — these used to be collapsed into the same generic message,
    // which made a broken Supabase connection look like a wrong password.
    if (error) {
      return NextResponse.json(
        {
          error: `Database error: ${error.message}. This usually means SUPABASE_URL or ` +
            `SUPABASE_SERVICE_ROLE_KEY is wrong, or the schema hasn't been run yet. ` +
            `Visit /api/health or run "npm run check-schema" to diagnose.`,
        },
        { status: 500 }
      );
    }

    if (!user || !user.is_active) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await createSession({ userId: user.id, role: user.role, email: user.email });

    return NextResponse.json({
      user: { id: user.id, name: user.full_name, role: user.role },
    });
  } catch (e: any) {
    // Catches connection failures (unreachable Supabase URL, DNS errors,
    // missing JWT_SECRET, etc.) instead of letting them surface as an
    // opaque crash or a misleading "Invalid credentials".
    return NextResponse.json(
      {
        error: `Login failed: ${e.message}. Visit /api/health or run "npm run check-schema" to diagnose.`,
      },
      { status: 500 }
    );
  }
}
