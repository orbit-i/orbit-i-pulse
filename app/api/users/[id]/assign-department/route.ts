// app/api/users/[id]/assign-department/route.ts
// One endpoint, two allowed callers:
//   - the person themselves, setting their OWN department/team (self-service)
//   - admin/CEO/CTO/HR Manager, setting ANYONE's (org management)
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const isSelf = session.userId === params.id;
  if (!isSelf && !canManageUsers(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
