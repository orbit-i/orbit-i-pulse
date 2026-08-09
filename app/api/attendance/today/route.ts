// app/api/attendance/today/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { DEFAULT_TIMEZONE } from "@/lib/office-hours";
import { localDateInTimezone } from "@/lib/timezones";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data: user } = await supabaseAdmin.from("users").select("timezone").eq("id", session.userId).maybeSingle();
  const timezone = user?.timezone || DEFAULT_TIMEZONE;
  const localDate = localDateInTimezone(new Date(), timezone);

  const { data } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("user_id", session.userId)
    .eq("check_in_date", localDate)
    .maybeSingle();

  return NextResponse.json({ attendance: data || null, timezone });
}
