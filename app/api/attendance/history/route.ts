// app/api/attendance/history/route.ts
// Returns the current user's attendance history, most-recent first.
//
// FIX: previously selected "date" and "ip_address" columns that don't
// exist in the schema (the real columns are the generated
// "check_in_date" and the separate "check_in_ip" / "check_out_ip").
// That mismatch made Supabase return a 500 on every single page load.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("attendance")
    .select("id, check_in_date, status, check_in, check_out, check_in_ip, check_out_ip, is_late, is_early_leave")
    .eq("user_id", session.userId)
    .order("check_in_date", { ascending: false })
    .limit(60);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Frontend expects `date` and `ip_address` field names — map here so
  // the UI layer doesn't need to know about the underlying DB columns.
  const records = (data ?? []).map((r) => ({
    id: r.id,
    date: r.check_in_date,
    status: r.status,
    check_in: r.check_in,
    check_out: r.check_out,
    ip_address: r.check_in_ip,
    is_late: r.is_late,
    is_early_leave: r.is_early_leave,
  }));

  return NextResponse.json(records);
}
