// app/api/leave/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { canApproveLeave } from "@/lib/permissions";

// GET /api/leave              -> my own leave requests
// GET /api/leave?scope=team   -> requests awaiting/handled by an approver
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const scope = req.nextUrl.searchParams.get("scope");
  let query = supabaseAdmin
    .from("leave_requests")
    .select("id, leave_type, start_date, end_date, reason, status, review_note, created_at, reviewed_at, user_id, requester:user_id(full_name, role, department_id), reviewer:reviewed_by(full_name)")
    .order("created_at", { ascending: false });

  if (scope === "team") {
    if (!canApproveLeave(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // Managers/leads see their direct reports' requests; exec/HR see everyone's.
    if (["admin", "ceo", "cto", "hr_manager", "associate_hr"].includes(session.role)) {
      // no extra filter — company-wide visibility
    } else {
      const { data: reports } = await supabaseAdmin.from("users").select("id").eq("manager_id", session.userId);
      const ids = (reports || []).map((r) => r.id);
      if (ids.length === 0) return NextResponse.json({ leaveRequests: [] });
      query = query.in("user_id", ids);
    }
  } else {
    query = query.eq("user_id", session.userId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leaveRequests: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { leaveType, startDate, endDate, reason } = await req.json();
  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Start and end dates are required" }, { status: 400 });
  }
  if (new Date(endDate) < new Date(startDate)) {
    return NextResponse.json({ error: "End date can't be before the start date" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("leave_requests")
    .insert({
      user_id: session.userId,
      leave_type: leaveType || "casual",
      start_date: startDate,
      end_date: endDate,
      reason: reason || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leaveRequest: data });
}
