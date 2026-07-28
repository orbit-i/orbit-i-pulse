// app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { canReviewReports } from "@/lib/permissions";

// Roles that see the WHOLE company's reports, not just their own team.
const COMPANY_WIDE = ["admin", "founder", "co_founder", "ceo", "cto", "coo", "hr_manager", "associate_hr"];
// Roles that see their direct reports' submissions (scoped by manager_id).
const TEAM_SCOPED = ["manager", "team_lead"];

// POST: intern submits today's report
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { tasksCompleted, blockers, hoursSpent } = await req.json();
  if (!tasksCompleted) {
    return NextResponse.json({ error: "tasksCompleted is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("daily_reports")
    .insert({
      user_id: session.userId,
      tasks_completed: tasksCompleted,
      blockers: blockers || null,
      hours_spent: hoursSpent || null,
    })
    .select()
    .single();

  // Unique constraint (user_id, report_date) blocks duplicate same-day submissions
  if (error) {
    const isDuplicate = error.code === "23505";
    return NextResponse.json(
      { error: isDuplicate ? "Report already submitted today" : error.message },
      { status: isDuplicate ? 409 : 500 }
    );
  }

  return NextResponse.json({ report: data });
}

// GET: manager/admin views team reports; intern views own reports
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let query = supabaseAdmin
    .from("daily_reports")
    .select(`
      id, report_date, tasks_completed, blockers, hours_spent, status,
      users:user_id ( id, full_name, manager_id ),
      performance_reviews ( rating, feedback, reviewer_id, created_at )
    `)
    .order("report_date", { ascending: false });

  // Company-wide roles see everything. Manager/team_lead see only their
  // direct reports' submissions. Everyone else (intern, employee, team
  // member, core_team_member, or any future individual-contributor role)
  // only ever sees their own — this is a strict allow-list, not a
  // "not X" fallthrough, so a newly added role can never accidentally
  // inherit broad access just by not matching a specific string.
  if (COMPANY_WIDE.includes(session.role)) {
    // no filter — sees everything
  } else if (TEAM_SCOPED.includes(session.role)) {
    const { data: team } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("manager_id", session.userId);
    const teamIds = (team || []).map((t) => t.id);
    query = query.in("user_id", teamIds.length ? teamIds : [session.userId]);
  } else {
    query = query.eq("user_id", session.userId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data });
}
