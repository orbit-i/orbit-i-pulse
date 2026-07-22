// app/api/departments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { canManageDepartments } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !canManageDepartments(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description, headUserId } = await req.json();
  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (description !== undefined) patch.description = description;
  if (headUserId !== undefined) patch.head_user_id = headUserId || null;

  const { data, error } = await supabaseAdmin
    .from("departments")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ department: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !canManageDepartments(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Detach members instead of orphaning the FK error path.
  await supabaseAdmin.from("users").update({ department_id: null }).eq("department_id", params.id);
  const { error } = await supabaseAdmin.from("departments").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
