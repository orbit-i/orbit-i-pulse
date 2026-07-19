// app/api/attendance/checkout/route.ts
// Office hours policy: check-out from 5:00 PM (Asia/Karachi) onward is
// on-time; checking out earlier is flagged as an early leave.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { getClientIp } from "@/lib/ip";
import { isEarlyCheckOut } from "@/lib/office-hours";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const ip = getClientIp(req);

  const { data: record } = await supabaseAdmin
    .from("attendance")
    .select("id")
    .eq("user_id", session.userId)
    .gte("check_in", `${today}T00:00:00`)
    .is("check_out", null)
    .maybeSingle();

  if (!record) {
    return NextResponse.json({ error: "No active check-in found for today" }, { status: 404 });
  }

  const now = new Date();
  const earlyLeave = isEarlyCheckOut(now);

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .update({ check_out: now.toISOString(), check_out_ip: ip, is_early_leave: earlyLeave })
    .eq("id", record.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attendance: data });
}
