// app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { canAssignTasks } from "@/lib/permissions";

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

  const { title, description, assignedTo, priority, dueDate, departmentId } = await req.json();
  if (!title?.trim() || !assignedTo) {
    return NextResponse.json({ error: "Title and assignee are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .insert({
      title: title.trim(),
      description: description || null,
      assigned_to: assignedTo,
      assigned_by: session.userId,
      department_id: departmentId || null,
      priority: priority || "medium",
      due_date: dueDate || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}
