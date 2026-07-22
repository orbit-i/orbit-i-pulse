// app/api/leave/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { canApproveLeave } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data: existing } = await supabaseAdmin.from("leave_requests").select("user_id, status").eq("id", params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const { status, reviewNote } = await req.json();

  // The requester can only cancel their own still-pending request.
  if (existing.user_id === session.userId) {
    if (status !== "cancelled" || existing.status !== "pending") {
      return NextResponse.json({ error: "You can only cancel your own pending request." }, { status: 403 });
    }
    const { data, error } = await supabaseAdmin
      .from("leave_requests")
      .update({ status: "cancelled" })
      .eq("id", params.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ leaveRequest: data });
  }

  // Otherwise this is an approver acting on someone else's request.
  if (!canApproveLeave(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Status must be 'approved' or 'rejected'" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("leave_requests")
    .update({ status, reviewed_by: session.userId, reviewed_at: new Date().toISOString(), review_note: reviewNote || null })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leaveRequest: data });
}
