// app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

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

  // Only admin and manager get to see other people's reports.
  // Every other role (intern, employee, core_team_member, or any future
  // role) only ever sees their own — this used to silently fall through
  // to "see everything" for any role that wasn't exactly "intern" or
  // "manager", which would have let core_team_member/employee see the
  // whole team's reports once those roles were introduced.
  if (session.role === "manager") {
    // Only reports from people assigned to this manager
    const { data: team } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("manager_id", session.userId);
    const teamIds = (team || []).map((t) => t.id);
    query = query.in("user_id", teamIds.length ? teamIds : [session.userId]);
  } else if (session.role !== "admin") {
    query = query.eq("user_id", session.userId);
  }
  // admin: no filter, sees everything

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data });
}
