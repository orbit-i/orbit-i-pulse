// app/api/users/[id]/route.ts
// DELETE ?mode=deactivate  -> soft: is_active=false, all their data stays intact
// DELETE ?mode=erase       -> hard: removes the user row; attendance,
//   reports, tasks, leave requests, and documents they own cascade-delete
//   with them (see the ON DELETE CASCADE foreign keys in the schema).
// PATCH  { isActive: true } -> reactivate a deactivated account.
// Only admin/CEO/CTO — this is more destructive than the HR-level
// "manage users" capability (role changes, department assignment).
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

const CAN_DELETE = ["admin", "ceo", "cto", "coo"];

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!CAN_DELETE.includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (params.id === session.userId) {
    return NextResponse.json({ error: "You can't remove your own account." }, { status: 400 });
  }

  const { data: target } = await supabaseAdmin.from("users").select("role, is_active").eq("id", params.id).maybeSingle();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (target.role === "admin") {
    const { count } = await supabaseAdmin.from("users").select("id", { count: "exact", head: true }).eq("role", "admin").eq("is_active", true);
    if ((count || 0) <= 1) {
      return NextResponse.json({ error: "Can't remove the last remaining admin." }, { status: 400 });
    }
  }

  const mode = req.nextUrl.searchParams.get("mode") === "erase" ? "erase" : "deactivate";

  if (mode === "deactivate") {
    const { error } = await supabaseAdmin.from("users").update({ is_active: false }).eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, mode: "deactivate" });
  }

  const { error } = await supabaseAdmin.from("users").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, mode: "erase" });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!CAN_DELETE.includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { isActive } = await req.json();
  const { error } = await supabaseAdmin.from("users").update({ is_active: !!isActive }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
