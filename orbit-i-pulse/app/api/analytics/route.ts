// app/api/analytics/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { canViewAllAttendance } from "@/lib/permissions";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canViewAllAttendance(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const since = sevenDaysAgo.toISOString().slice(0, 10);

  const [attendanceRes, taskRes, leaveRes, deptRes] = await Promise.all([
    supabaseAdmin.from("attendance").select("check_in_date, status").gte("check_in_date", since),
    supabaseAdmin.from("tasks").select("status"),
    supabaseAdmin.from("leave_requests").select("status"),
    supabaseAdmin.from("departments").select("id, name"),
  ]);

  // Attendance per day for the last 7 days
  const days: { date: string; present: number; late: number; absent: number; half_day: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const rows = (attendanceRes.data || []).filter((r: any) => r.check_in_date === key);
    days.push({
      date: key,
      present: rows.filter((r: any) => r.status === "present").length,
      late: rows.filter((r: any) => r.status === "late").length,
      absent: rows.filter((r: any) => r.status === "absent").length,
      half_day: rows.filter((r: any) => r.status === "half_day").length,
    });
  }

  const taskCounts = { todo: 0, in_progress: 0, blocked: 0, done: 0 };
  (taskRes.data || []).forEach((t: any) => { if (t.status in taskCounts) (taskCounts as any)[t.status]++; });

  const leaveCounts = { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
  (leaveRes.data || []).forEach((l: any) => { if (l.status in leaveCounts) (leaveCounts as any)[l.status]++; });

  const { data: headcounts } = await supabaseAdmin.from("users").select("department_id").eq("is_active", true);
  const deptHeadcount = (deptRes.data || []).map((d: any) => ({
    name: d.name,
    count: (headcounts || []).filter((u: any) => u.department_id === d.id).length,
  }));

  return NextResponse.json({ attendanceByDay: days, taskCounts, leaveCounts, deptHeadcount });
}
