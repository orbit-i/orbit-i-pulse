// app/api/users/[id]/role/route.ts
// Admin promotes/demotes a user between roles. Uses the SAME
// ALL_ROLES list as the Team page dropdown (see lib/roles.ts) —
// previously these were two separate hardcoded lists that drifted
// apart and caused "Invalid role" errors.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";
import { isValidRole } from "@/lib/roles";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { role } = await req.json();
  if (!isValidRole(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .update({ role })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}
