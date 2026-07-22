// app/api/users/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";
import type { Role } from "@/lib/roles";

// Company-wide visibility: system admin + both founders (CEO/CTO) + HR.
// Team leads and line managers only see their own direct reports.
const COMPANY_WIDE_ROLES: Role[] = ["admin", "ceo", "cto", "hr_manager", "associate_hr"];
const SCOPED_ROLES: Role[] = ["manager", "team_lead"];

export async function GET() {
  let session;
  try {
    session = await requireRole(...COMPANY_WIDE_ROLES, ...SCOPED_ROLES);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let query = supabaseAdmin
    .from("users")
    .select("id, full_name, email, phone, role, is_active, manager_id, department_id, job_title, team_id, avatar_url, departments(name), teams(name), created_at")
    .order("created_at", { ascending: false });

  if (SCOPED_ROLES.includes(session.role)) query = query.eq("manager_id", session.userId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}
