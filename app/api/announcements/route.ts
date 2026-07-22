// app/api/announcements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { canPostAnnouncements } from "@/lib/permissions";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("announcements")
    .select("id, title, body, created_at, department_id, poster:posted_by(full_name, role), departments(name)")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcements: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canPostAnnouncements(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, body, departmentId } = await req.json();
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("announcements")
    .insert({ title: title.trim(), body: body.trim(), posted_by: session.userId, department_id: departmentId || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcement: data });
}
