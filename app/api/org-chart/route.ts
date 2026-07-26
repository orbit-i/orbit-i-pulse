// app/api/org-chart/route.ts
// Builds a real organizational tree: Company -> Departments -> Teams
// -> People. Deliberately excludes the "admin" role — that's a system/
// technical account, not a real org seat, so it never appears in the
// visual chart (it still works everywhere else in the app). If you
// want yourself to appear on the chart, promote your own account to
// ceo/cto/coo from the Team page.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { roleLevel } from "@/lib/roles";

const UNASSIGNED_ID = "unassigned";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const [{ data: users, error: usersErr }, { data: departments, error: deptErr }, { data: teams, error: teamsErr }, { data: settings }] =
    await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, full_name, role, job_title, department_id, team_id, is_active, avatar_url")
        .eq("is_active", true)
        .neq("role", "admin"),
      supabaseAdmin.from("departments").select("id, name, head_user_id"),
      supabaseAdmin.from("teams").select("id, name, department_id, lead_user_id"),
      supabaseAdmin.from("company_settings").select("company_name").eq("id", 1).maybeSingle(),
    ]);

  if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 });
  if (deptErr) return NextResponse.json({ error: deptErr.message }, { status: 500 });
  if (teamsErr) return NextResponse.json({ error: teamsErr.message }, { status: 500 });

  const people = (users || []).map((u: any) => ({
    type: "person" as const,
    id: u.id,
    fullName: u.full_name,
    role: u.role,
    jobTitle: u.job_title,
    departmentId: u.department_id,
    teamId: u.team_id,
    avatarUrl: u.avatar_url || null,
  }));

  const byRole = (a: any, b: any) => roleLevel(b.role) - roleLevel(a.role);
  const withLead = (p: any, isLead: boolean) => ({ ...p, isLead });

  function buildTeamNode(team: any) {
    const members = people
      .filter((p) => p.teamId === team.id)
      .sort(byRole)
      .map((p) => withLead(p, p.id === team.lead_user_id));
    members.sort((a, b) => (b.isLead ? 1 : 0) - (a.isLead ? 1 : 0));
    return { type: "team" as const, id: team.id, name: team.name, members };
  }

  function buildDepartmentNode(dept: { id: string; name: string; head_user_id: string | null }) {
    const deptTeams = (teams || []).filter((t) => t.department_id === dept.id).map(buildTeamNode);
    const teamMemberIds = new Set(deptTeams.flatMap((t) => t.members.map((m) => m.id)));
    const headPerson = people.find((p) => p.id === dept.head_user_id);
    // Direct members = in this department, not on any of its teams, not the head
    // (these render as a wrapped roster, not individual tree branches — a
    // department with 14 loose people should never force the page 3500px wide).
    const directMembers = people
      .filter((p) => p.departmentId === dept.id && !teamMemberIds.has(p.id) && p.id !== dept.head_user_id)
      .sort(byRole)
      .map((p) => withLead(p, false));
    return {
      type: "department" as const,
      id: dept.id,
      name: dept.name,
      headName: headPerson?.fullName || null,
      headcount: people.filter((p) => p.departmentId === dept.id).length,
      teams: deptTeams,
      directMembers,
    };
  }

  const departmentNodes = (departments || []).map(buildDepartmentNode);

  const assignedIds = new Set(people.filter((p) => p.departmentId).map((p) => p.id));
  const unassigned = people.filter((p) => !assignedIds.has(p.id)).sort(byRole).map((p) => withLead(p, false));

  const tree = [
    ...departmentNodes,
    ...(unassigned.length > 0
      ? [{ type: "department" as const, id: UNASSIGNED_ID, name: "Unassigned", headName: null, headcount: unassigned.length, teams: [], directMembers: unassigned }]
      : []),
  ];

  return NextResponse.json({
    companyName: settings?.company_name || "ORBIT-I",
    tree,
    totalPeople: people.length,
  });
}
