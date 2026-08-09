// app/api/teams/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { canManageTeams } from "@/lib/permissions";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("teams")
    .select("id, name, description, department_id, lead_user_id, departments(name), lead:lead_user_id(full_name)")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: counts } = await supabaseAdmin.from("users").select("team_id").eq("is_active", true);
  const headcount: Record<string, number> = {};
  (counts || []).forEach((u: any) => { if (u.team_id) headcount[u.team_id] = (headcount[u.team_id] || 0) + 1; });

  const teams = (data || []).map((t: any) => ({ ...t, departmentName: t.departments?.name || null, leadName: t.lead?.full_name || null, headcount: headcount[t.id] || 0 }));
  return NextResponse.json({ teams });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canManageTeams(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, departmentId, leadUserId, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Team name is required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("teams")
    .insert({ name: name.trim(), department_id: departmentId || null, lead_user_id: leadUserId || null, description: description || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ team: data });
}
