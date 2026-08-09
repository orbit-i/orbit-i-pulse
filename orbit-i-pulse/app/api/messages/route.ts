// app/api/messages/route.ts
// Department/team group chat (WhatsApp-style channels). Anyone whose
// department_id/team_id matches the channel can read+post; elevated
// roles (admin/founder/co_founder/ceo/cto/coo/hr_manager/associate_hr)
// can read+post in any channel for oversight/coordination.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

const ELEVATED = ["admin", "founder", "co_founder", "ceo", "cto", "coo", "hr_manager", "associate_hr"];

async function checkAccess(userId: string, role: string, scope: "department" | "team", id: string) {
  if (ELEVATED.includes(role)) return true;
  const { data } = await supabaseAdmin.from("users").select("department_id, team_id").eq("id", userId).maybeSingle();
  if (scope === "department") return data?.department_id === id;
  return data?.team_id === id;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const scope = req.nextUrl.searchParams.get("scope") as "department" | "team" | null;
  const id = req.nextUrl.searchParams.get("id");
  if (!scope || !id || !["department", "team"].includes(scope)) {
    return NextResponse.json({ error: "scope and id are required" }, { status: 400 });
  }

  const allowed = await checkAccess(session.userId, session.role, scope, id);
  if (!allowed) return NextResponse.json({ error: "You're not a member of this channel." }, { status: 403 });

  const col = scope === "department" ? "department_id" : "team_id";
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("id, body, created_at, sender_id, sender:sender_id(full_name, role, avatar_url, job_title)")
    .eq(col, id)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { scope, id, body } = await req.json();
  if (!scope || !id || !body?.trim() || !["department", "team"].includes(scope)) {
    return NextResponse.json({ error: "scope, id, and body are required" }, { status: 400 });
  }

  const allowed = await checkAccess(session.userId, session.role, scope, id);
  if (!allowed) return NextResponse.json({ error: "You're not a member of this channel." }, { status: 403 });

  const row: Record<string, unknown> = { sender_id: session.userId, body: body.trim() };
  row[scope === "department" ? "department_id" : "team_id"] = id;

  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert(row)
    .select("id, body, created_at, sender_id, sender:sender_id(full_name, role, avatar_url, job_title)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data });
}
