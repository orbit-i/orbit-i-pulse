// app/api/teams/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { canManageTeams } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !canManageTeams(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, departmentId, leadUserId, description } = await req.json();
  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (departmentId !== undefined) patch.department_id = departmentId || null;
  if (leadUserId !== undefined) patch.lead_user_id = leadUserId || null;
  if (description !== undefined) patch.description = description;

  const { data, error } = await supabaseAdmin.from("teams").update(patch).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ team: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !canManageTeams(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await supabaseAdmin.from("users").update({ team_id: null }).eq("team_id", params.id);
  const { error } = await supabaseAdmin.from("teams").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
