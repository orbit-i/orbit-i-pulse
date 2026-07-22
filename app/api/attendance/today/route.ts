// app/api/attendance/today/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabaseAdmin
    .from("attendance")
    .select("*")
    .eq("user_id", session.userId)
    .gte("check_in", `${today}T00:00:00`)
    .lte("check_in", `${today}T23:59:59`)
    .maybeSingle();

  return NextResponse.json({ attendance: data || null });
}
