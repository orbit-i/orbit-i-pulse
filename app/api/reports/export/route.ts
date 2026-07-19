// app/api/reports/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireRole("admin", "manager");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const query = supabaseAdmin
    .from("daily_reports")
    .select(`
      report_date, tasks_completed, blockers, hours_spent, status,
      users:user_id(full_name, email, manager_id),
      performance_reviews(rating, feedback)
    `)
    .order("report_date", { ascending: false });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const filtered = session.role === "manager"
    ? (data || []).filter((r: any) => r.users?.manager_id === session.userId)
    : data || [];

  const rows = filtered.map((r: any) => ({
    name: r.users?.full_name,
    email: r.users?.email,
    date: r.report_date,
    tasks: r.tasks_completed,
    blockers: r.blockers,
    hours: r.hours_spent,
    status: r.status,
    rating: r.performance_reviews?.[0]?.rating ?? "",
    feedback: r.performance_reviews?.[0]?.feedback ?? "",
  }));

  const csv = toCsv(rows, [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "date", label: "Date" },
    { key: "tasks", label: "Tasks Completed" },
    { key: "blockers", label: "Blockers" },
    { key: "hours", label: "Hours Spent" },
    { key: "status", label: "Status" },
    { key: "rating", label: "Rating" },
    { key: "feedback", label: "Feedback" },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="reports-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
