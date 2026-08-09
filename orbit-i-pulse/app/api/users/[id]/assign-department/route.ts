// app/api/users/[id]/assign-department/route.ts
// Admin-panel-only. Department/team placement is deliberately NOT
// self-service — a person cannot pick their own department from their
// profile. Only admin/CEO/CTO/COO/HR Manager (canManageUsers) can move
// anyone into a department/team, so org structure stays consistent
// and intentional rather than everyone self-selecting.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  if (!canManageUsers(session.role)) {
    return NextResponse.json({ error: "Only an admin, CEO, CTO, COO, or HR Manager can assign departments/teams." }, { status: 403 });
  }

  const { departmentId, teamId } = await req.json();
  const patch: Record<string, unknown> = {};
  if (departmentId !== undefined) patch.department_id = departmentId || null;
  if (teamId !== undefined) patch.team_id = teamId || null;

  // A team must belong to the department being set (or the department
  // being kept, if not changing it) — stops "Engineering" people ending
  // up inside an "HR" team by picking mismatched dropdowns.
  if (patch.team_id) {
    const { data: team } = await supabaseAdmin.from("teams").select("department_id").eq("id", patch.team_id).maybeSingle();
    const targetDept = patch.department_id !== undefined ? patch.department_id : (await supabaseAdmin.from("users").select("department_id").eq("id", params.id).maybeSingle()).data?.department_id;
    if (team && team.department_id && targetDept && team.department_id !== targetDept) {
      return NextResponse.json({ error: "That team belongs to a different department." }, { status: 400 });
    }
  }

  const { data, error } = await supabaseAdmin.from("users").update(patch).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}
