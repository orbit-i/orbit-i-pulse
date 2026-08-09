// app/api/attendance/checkout/route.ts
// Office hours: check-out from 5:00 PM in the person's OWN timezone
// onward is on-time; earlier is flagged as an early leave.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { getClientIp } from "@/lib/ip";
import { isEarlyCheckOut, DEFAULT_TIMEZONE } from "@/lib/office-hours";
import { localDateInTimezone } from "@/lib/timezones";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data: user } = await supabaseAdmin.from("users").select("timezone").eq("id", session.userId).maybeSingle();
  const timezone = user?.timezone || DEFAULT_TIMEZONE;

  const now = new Date();
  const localDate = localDateInTimezone(now, timezone);
  const ip = getClientIp(req);

  const { data: record } = await supabaseAdmin
    .from("attendance")
    .select("id")
    .eq("user_id", session.userId)
    .eq("check_in_date", localDate)
    .is("check_out", null)
    .maybeSingle();

  if (!record) {
    return NextResponse.json({ error: "No active check-in found for today" }, { status: 404 });
  }

  const earlyLeave = isEarlyCheckOut(now, timezone);

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .update({ check_out: now.toISOString(), check_out_ip: ip, is_early_leave: earlyLeave })
    .eq("id", record.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attendance: data });
}
