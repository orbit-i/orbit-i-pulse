// app/api/cron/auto-checkout/route.ts
// Runs at 00:00 PKT (see vercel.json) — anyone who forgot to check out
// gets automatically checked out at 11:59 PM of the day they checked
// in, flagged with a note so it's clearly distinguishable from a real
// checkout. A fresh check-in the next day always creates a brand-new
// attendance row (one row per calendar day), so "the new day" starts
// naturally the moment someone checks in — nothing else to reset.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { notify } from "@/lib/notify";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // "Today" from this cron's point of view is the day that's just ending
  // (it runs right at 00:00 PKT), so look back at yesterday's date.
  const now = new Date();
  const cutoff = new Date(now.getTime() - 60 * 1000); // small buffer past midnight
  const dateKey = cutoff.toISOString().split("T")[0];

  const { data: openSessions, error } = await supabaseAdmin
    .from("attendance")
    .select("id, user_id, check_in")
    .gte("check_in", `${dateKey}T00:00:00`)
    .lt("check_in", `${dateKey}T23:59:59`)
    .is("check_out", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let closed = 0;
  for (const row of openSessions || []) {
    const endOfDay = new Date(`${dateKey}T23:59:59`);
    await supabaseAdmin
      .from("attendance")
      .update({
        check_out: endOfDay.toISOString(),
        is_early_leave: false,
        notes: "Auto checked-out by system — forgot to check out",
      })
      .eq("id", row.id);
    await notify(
      row.user_id,
      "You were auto checked-out",
      "You forgot to check out yesterday, so the system closed your attendance at 11:59 PM.",
      "attendance",
      "/dashboard/attendance"
    );
    closed++;
  }

  return NextResponse.json({ autoCheckedOut: closed });
}
