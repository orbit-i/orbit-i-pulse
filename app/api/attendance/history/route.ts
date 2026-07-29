// app/api/attendance/history/route.ts
// Returns attendance history. Company-wide roles see EVERYONE's full
// history; manager/team_lead see their direct reports'; everyone else
// sees only their own. (Previously this always filtered to the
// requester's own user_id regardless of role — that's why admins
// couldn't see anyone else's attendance.)
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const COMPANY_WIDE = ["admin", "founder", "co_founder", "ceo", "cto", "coo", "hr_manager", "associate_hr"];
const TEAM_SCOPED = ["manager", "team_lead"];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let query = supabaseAdmin
    .from("attendance")
    .select("id, check_in_date, status, check_in, check_out, check_in_ip, check_out_ip, is_late, is_early_leave, user_id, users(full_name)")
    .order("check_in_date", { ascending: false })
    .limit(500);

  if (COMPANY_WIDE.includes(session.role)) {
    // no filter — everyone's history
  } else if (TEAM_SCOPED.includes(session.role)) {
    const { data: team } = await supabaseAdmin.from("users").select("id").eq("manager_id", session.userId);
    const ids = (team || []).map((t) => t.id);
    ids.push(session.userId);
    query = query.in("user_id", ids);
  } else {
    query = query.eq("user_id", session.userId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const records = (data ?? []).map((r: any) => ({
    id: r.id,
    date: r.check_in_date,
    status: r.status,
    check_in: r.check_in,
    check_out: r.check_out,
    ip_address: r.check_in_ip,
    is_late: r.is_late,
    is_early_leave: r.is_early_leave,
    full_name: r.users?.full_name || null,
  }));

  return NextResponse.json(records);
}
