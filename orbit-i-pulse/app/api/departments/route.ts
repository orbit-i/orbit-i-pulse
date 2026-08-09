// app/api/departments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { canManageDepartments } from "@/lib/permissions";

// Anyone signed in can VIEW departments (it's workspace directory info),
// but only admin/CEO/CTO/HR Manager can create or rename them.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("departments")
    .select("id, name, description, head_user_id, users:head_user_id(full_name), created_at")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach a live headcount per department for the Departments page.
  const { data: counts } = await supabaseAdmin
    .from("users")
    .select("department_id")
    .eq("is_active", true);

  const headcount: Record<string, number> = {};
  (counts || []).forEach((u: any) => {
    if (!u.department_id) return;
    headcount[u.department_id] = (headcount[u.department_id] || 0) + 1;
  });

  const departments = (data || []).map((d: any) => ({
    ...d,
    headName: d.users?.full_name || null,
    headcount: headcount[d.id] || 0,
  }));

  return NextResponse.json({ departments });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canManageDepartments(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description, headUserId } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Department name is required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("departments")
    .insert({ name: name.trim(), description: description || null, head_user_id: headUserId || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ department: data });
}
