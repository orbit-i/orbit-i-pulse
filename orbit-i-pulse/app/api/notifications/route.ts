// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("id, title, body, type, link, is_read, created_at")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const unreadCount = (data || []).filter((n) => !n.is_read).length;
  return NextResponse.json({ notifications: data, unreadCount });
}

// PATCH { id } -> mark one read.  PATCH { all: true } -> mark everything read.
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id, all } = await req.json();
  let query = supabaseAdmin.from("notifications").update({ is_read: true }).eq("user_id", session.userId);
  query = all ? query.eq("is_read", false) : query.eq("id", id);

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
