// app/api/users/[id]/assign-manager/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("admin"); // only admin reassigns managers
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { managerId } = await req.json(); // null clears the assignment

  const { data, error } = await supabaseAdmin
    .from("users")
    .update({ manager_id: managerId || null })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}
