// app/api/profile/route.ts
// Self-service profile editing — every seat can update their OWN name,
// phone, job title, avatar, AND their department/team (this is an
// intentionally low-friction, self-select model — admins can still
// correct it from the Team page if needed).
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, full_name, email, phone, job_title, avatar_url, role, department_id, team_id, departments!fk_users_department(name), teams!fk_users_team(name), manager_id, manager:manager_id(full_name), created_at")
    .eq("id", session.userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { fullName, phone, jobTitle, avatarUrl, departmentId, teamId } = await req.json();
  const patch: Record<string, unknown> = {};
  if (fullName !== undefined) {
    if (!fullName.trim()) return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
    patch.full_name = fullName.trim();
  }
  if (phone !== undefined) patch.phone = phone || null;
  if (jobTitle !== undefined) patch.job_title = jobTitle || null;
  if (avatarUrl !== undefined) patch.avatar_url = avatarUrl || null;

  if (teamId !== undefined) {
    if (teamId) {
      // Setting a team also locks in the matching department, so the
      // two never disagree (e.g. picking "Mobile Team" auto-sets
      // "Engineering" even if the person didn't touch that field).
      const { data: team } = await supabaseAdmin.from("teams").select("department_id").eq("id", teamId).maybeSingle();
      patch.team_id = teamId;
      if (team?.department_id) patch.department_id = team.department_id;
    } else {
      patch.team_id = null;
    }
  }
  if (departmentId !== undefined && patch.department_id === undefined) {
    patch.department_id = departmentId || null;
    // Changing department away from your team's department clears the team.
    if (!departmentId) patch.team_id = null;
  }

  const { data, error } = await supabaseAdmin.from("users").update(patch).eq("id", session.userId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
