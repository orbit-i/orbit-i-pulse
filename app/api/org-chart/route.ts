// app/api/org-chart/route.ts
// Builds the full company directory + reporting tree. Visible to
// everyone (it's a workspace directory, not sensitive data) — every
// seat should be able to see who's who and who reports to whom.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { roleLevel } from "@/lib/roles";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, full_name, role, job_title, manager_id, department_id, is_active, avatar_url, departments(name)")
    .eq("is_active", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const people = (data || []).map((u: any) => ({
    id: u.id,
    fullName: u.full_name,
    role: u.role,
    jobTitle: u.job_title,
    managerId: u.manager_id,
    departmentId: u.department_id,
    departmentName: u.departments?.name || null,
    avatarUrl: u.avatar_url || null,
  }));

  // Roots = people with no manager, ranked by seniority so CEO/CTO/admin
  // surface first even if manager_id happens to be null for several people.
  const byId = new Map(people.map((p) => [p.id, { ...p, reports: [] as any[] }]));
  const roots: any[] = [];

  for (const p of byId.values()) {
    if (p.managerId && byId.has(p.managerId)) {
      byId.get(p.managerId)!.reports.push(p);
    } else {
      roots.push(p);
    }
  }
  roots.sort((a, b) => roleLevel(b.role) - roleLevel(a.role));
  for (const p of byId.values()) p.reports.sort((a: any, b: any) => roleLevel(b.role) - roleLevel(a.role));

  return NextResponse.json({ tree: roots, people });
}
