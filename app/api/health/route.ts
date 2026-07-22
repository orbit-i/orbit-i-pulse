// app/api/health/route.ts
// Visit /api/health after deploying (or running `npm run dev`) to
// verify env vars and the database schema are correctly set up,
// without needing to log in or guess what's wrong from a blank
// failed request. Returns which checks pass/fail and why.
import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  // 1. Required env vars present?
  const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET"];
  for (const key of requiredEnvVars) {
    checks[key] = {
      ok: Boolean(process.env[key]),
      detail: process.env[key] ? "set" : "MISSING — add this to .env.local or Vercel env vars",
    };
  }

  // 2. Can we actually reach Supabase and does the schema exist?
  if (checks.SUPABASE_URL.ok && checks.SUPABASE_SERVICE_ROLE_KEY.ok) {
    try {
      const { supabaseAdmin } = await import("@/lib/supabase");
      const { error } = await supabaseAdmin.from("users").select("id").limit(1);
      checks.database_schema = error
        ? { ok: false, detail: `Could not query "users" table: ${error.message}. Did you run supabase/schema.sql?` }
        : { ok: true, detail: "users table reachable" };
    } catch (e: any) {
      checks.database_schema = { ok: false, detail: `Supabase client error: ${e.message}` };
    }
  } else {
    checks.database_schema = { ok: false, detail: "skipped — fix Supabase env vars first" };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "misconfigured",
      checks,
    },
    { status: allOk ? 200 : 500 }
  );
}
