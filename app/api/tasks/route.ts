// app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { canAssignTasks } from "@/lib/permissions";
import { notify } from "@/lib/notify";

// GET /api/tasks            -> tasks assigned to me
// GET /api/tasks?scope=given -> tasks I assigned to others (leads/managers/exec/HR only)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const scope = req.nextUrl.searchParams.get("scope");
  let query = supabaseAdmin
    .from("tasks")
    .select("id, title, description, priority, status, due_date, created_at, assigned_to, assigned_by, assignee:assigned_to(full_name, role), assigner:assigned_by(full_name, role)")
    .order("created_at", { ascending: false });

  if (scope === "given") {
    if (!canAssignTasks(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    query = query.eq("assigned_by", session.userId);
  } else {
    query = query.eq("assigned_to", session.userId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canAssignTasks(session.role)) {
    return NextResponse.json({ error: "You don't have permission to assign tasks." }, { status: 403 });
  }

  const { title, description, assignedTo, priority, dueDate, departmentId, assignToTeamId, assignToDepartmentId } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // Bulk mode: assign the same task to every member of a team or department at once.
  let targetIds: string[] = [];
  if (assignToTeamId) {
    const { data } = await supabaseAdmin.from("users").select("id").eq("team_id", assignToTeamId).eq("is_active", true);
    targetIds = (data || []).map((u) => u.id);
  } else if (assignToDepartmentId) {
    const { data } = await supabaseAdmin.from("users").select("id").eq("department_id", assignToDepartmentId).eq("is_active", true);
    targetIds = (data || []).map((u) => u.id);
  } else if (assignedTo) {
    targetIds = [assignedTo];
  }

  if (targetIds.length === 0) {
    return NextResponse.json({ error: "Pick a person, team, or department to assign to." }, { status: 400 });
  }

  const rows = targetIds.map((uid) => ({
    title: title.trim(),
    description: description || null,
    assigned_to: uid,
    assigned_by: session.userId,
    department_id: departmentId || null,
    priority: priority || "medium",
    due_date: dueDate || null,
  }));

  const { data, error } = await supabaseAdmin.from("tasks").insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const uid of targetIds) {
    notify(uid, "New task assigned", title.trim(), "task", "/dashboard/tasks");
  }

  return NextResponse.json({ tasks: data, count: targetIds.length });
}
