// app/api/reports/[id]/review/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";

// Manager/admin rates a submitted report
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let session;
  try {
    session = await requireRole("manager", "admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { rating, feedback } = await req.json();
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("performance_reviews")
    .insert({
      report_id: params.id,
      reviewer_id: session.userId,
      rating,
      feedback: feedback || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin
    .from("daily_reports")
    .update({ status: "reviewed" })
    .eq("id", params.id);

  return NextResponse.json({ review: data });
}
