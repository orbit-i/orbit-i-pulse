// app/api/cron/checkout-reminder/route.ts
// Runs at 11:00 PM PKT (see vercel.json) — reminds anyone still
// checked in today to check out before the auto-checkout at midnight.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { notify } from "@/lib/notify";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  const { data: openSessions, error } = await supabaseAdmin
    .from("attendance")
    .select("id, user_id")
    .gte("check_in", `${today}T00:00:00`)
    .is("check_out", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const row of openSessions || []) {
    await notify(
      row.user_id,
      "Don't forget to check out",
      "You're still checked in for today. Check out before midnight or the system will do it automatically.",
      "attendance",
      "/dashboard/attendance"
    );
  }

  return NextResponse.json({ reminded: (openSessions || []).length });
}
