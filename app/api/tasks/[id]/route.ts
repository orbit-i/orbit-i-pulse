// app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

// The assignee can update status (todo/in_progress/blocked/done).
// The assigner (or an exec/HR) can edit title/description/priority/due date.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data: existing } = await supabaseAdmin.from("tasks").select("assigned_to, assigned_by").eq("id", params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const isAssignee = existing.assigned_to === session.userId;
  const isAssigner = existing.assigned_by === session.userId;
  const isElevated = ["admin", "ceo", "cto", "hr_manager"].includes(session.role);

  if (!isAssignee && !isAssigner && !isElevated) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  // Anyone with access to the task can move its status.
  if (body.status !== undefined) patch.status = body.status;

  // Only the assigner or an elevated role can change the task's definition.
  if (isAssigner || isElevated) {
    if (body.title !== undefined) patch.title = body.title;
    if (body.description !== undefined) patch.description = body.description;
    if (body.priority !== undefined) patch.priority = body.priority;
    if (body.dueDate !== undefined) patch.due_date = body.dueDate;
    if (body.assignedTo !== undefined) patch.assigned_to = body.assignedTo;
  }

  const { data, error } = await supabaseAdmin.from("tasks").update(patch).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data: existing } = await supabaseAdmin.from("tasks").select("assigned_by").eq("id", params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const isAssigner = existing.assigned_by === session.userId;
  const isElevated = ["admin", "ceo", "cto", "hr_manager"].includes(session.role);
  if (!isAssigner && !isElevated) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabaseAdmin.from("tasks").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
