// app/api/attendance/checkin/route.ts
// Office hours policy: check-in expected by 9:00 AM (Asia/Karachi).
// Checking in after 9:00 AM marks the day "late" — using Karachi wall
// clock time regardless of which timezone the server (Vercel) runs in.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { getClientIp } from "@/lib/ip";
import { isLateCheckIn } from "@/lib/office-hours";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const ip = getClientIp(req);

  // Prevent duplicate check-in for the same day (DB unique index also enforces this)
  const { data: existing } = await supabaseAdmin
    .from("attendance")
    .select("id, check_out")
    .eq("user_id", session.userId)
    .gte("check_in", `${today}T00:00:00`)
    .lte("check_in", `${today}T23:59:59`)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Already checked in today" }, { status: 409 });
  }

  const now = new Date();
  const isLate = isLateCheckIn(now);

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .insert({
      user_id: session.userId,
      check_in: now.toISOString(),
      check_in_ip: ip,
      status: isLate ? "late" : "present",
      is_late: isLate,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attendance: data });
}
