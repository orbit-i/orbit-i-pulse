// app/api/attendance/checkin/route.ts
// Office hours: 9:00 AM in the person's OWN timezone (see lib/timezones.ts
// and lib/office-hours.ts) — a distributed team spread across countries
// each get judged against their own local 9 AM, not one fixed zone.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { getClientIp } from "@/lib/ip";
import { isLateCheckIn, DEFAULT_TIMEZONE } from "@/lib/office-hours";
import { localDateInTimezone } from "@/lib/timezones";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data: user } = await supabaseAdmin.from("users").select("timezone").eq("id", session.userId).maybeSingle();
  const timezone = user?.timezone || DEFAULT_TIMEZONE;

  const now = new Date();
  const localDate = localDateInTimezone(now, timezone);
  const ip = getClientIp(req);

  // Prevent duplicate check-in for the same LOCAL day (DB unique index also enforces this)
  const { data: existing } = await supabaseAdmin
    .from("attendance")
    .select("id, check_out")
    .eq("user_id", session.userId)
    .eq("check_in_date", localDate)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Already checked in today" }, { status: 409 });
  }

  const isLate = isLateCheckIn(now, timezone);

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .insert({
      user_id: session.userId,
      check_in: now.toISOString(),
      check_in_date: localDate,
      check_in_ip: ip,
      status: isLate ? "late" : "present",
      is_late: isLate,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attendance: data });
}
