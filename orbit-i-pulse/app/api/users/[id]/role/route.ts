// app/api/users/[id]/role/route.ts
// Admin promotes/demotes a user between roles. Uses the SAME
// ALL_ROLES list as the Team page dropdown (see lib/roles.ts) —
// previously these were two separate hardcoded lists that drifted
// apart and caused "Invalid role" errors.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";
import { isValidRole, ROLE_LABELS, type Role } from "@/lib/roles";
import { notify } from "@/lib/notify";
import { logActivity } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let session;
  try {
    session = await requireRole("admin", "founder", "co_founder", "ceo", "cto", "coo");
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
  notify(params.id, "Your role was updated", `You are now: ${ROLE_LABELS[role as Role] || role}`, "role", "/dashboard/profile");
  logActivity(session.userId, "role_changed", "user", params.id, { newRole: role, name: data.full_name });
  return NextResponse.json({ user: data });
}
