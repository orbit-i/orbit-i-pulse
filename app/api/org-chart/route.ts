// app/api/org-chart/route.ts
// Builds a real organizational tree: Company -> Departments -> Teams
// -> People (team lead first, then members by seniority). People with
// no department land in a virtual "Unassigned" bucket so nobody gets
// silently dropped from the chart. Visible to everyone signed in —
// it's a workspace directory, not sensitive data.
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
        .eq("is_active", true),
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
  const personNode = (p: any, isLead: boolean) => ({ ...p, isLead });

  function buildTeamNode(team: any) {
    const members = people
      .filter((p) => p.teamId === team.id)
      .sort(byRole)
      .map((p) => personNode(p, p.id === team.lead_user_id));
    // Ensure the lead always renders first even if seniority sorting disagrees.
    members.sort((a, b) => (b.isLead ? 1 : 0) - (a.isLead ? 1 : 0));
    return {
      type: "team" as const,
      id: team.id,
      name: team.name,
      children: members,
    };
  }

  function buildDepartmentNode(dept: { id: string; name: string; head_user_id: string | null }) {
    const deptTeams = (teams || []).filter((t) => t.department_id === dept.id).map(buildTeamNode);
    const teamMemberIds = new Set((teams || []).filter((t) => t.department_id === dept.id).flatMap((t) => people.filter((p) => p.teamId === t.id).map((p) => p.id)));
    // People in this department but not on any of its teams (yet).
    const looseMembers = people
      .filter((p) => p.departmentId === dept.id && !teamMemberIds.has(p.id) && p.id !== dept.head_user_id)
      .sort(byRole)
      .map((p) => personNode(p, false));
    const headPerson = people.find((p) => p.id === dept.head_user_id);
    const children = [
      ...(headPerson ? [personNode(headPerson, true)] : []),
      ...deptTeams,
      ...looseMembers,
    ];
    return {
      type: "department" as const,
      id: dept.id,
      name: dept.name,
      headName: headPerson?.fullName || null,
      headcount: people.filter((p) => p.departmentId === dept.id).length,
      children,
    };
  }

  const departmentNodes = (departments || []).map(buildDepartmentNode);

  const assignedIds = new Set(people.filter((p) => p.departmentId).map((p) => p.id));
  const unassigned = people.filter((p) => !assignedIds.has(p.id)).sort(byRole).map((p) => personNode(p, false));

  const tree = [
    ...departmentNodes,
    ...(unassigned.length > 0
      ? [{ type: "department" as const, id: UNASSIGNED_ID, name: "Unassigned", headName: null, headcount: unassigned.length, children: unassigned }]
      : []),
  ];

  return NextResponse.json({
    companyName: settings?.company_name || "ORBIT-I",
    tree,
    totalPeople: people.length,
  });
}
