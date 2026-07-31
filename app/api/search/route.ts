// app/api/search/route.ts
// Lightweight global search across people, tasks, and documents —
// each scoped to what the requester is already allowed to see (same
// rules as their dedicated pages, just condensed for a quick lookup).
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

const ELEVATED = ["admin", "founder", "co_founder", "ceo", "cto", "coo", "hr_manager", "associate_hr"];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ people: [], tasks: [], documents: [] });

  const like = `%${q}%`;
  const isElevated = ELEVATED.includes(session.role);

  const { data: me } = await supabaseAdmin.from("users").select("department_id, team_id").eq("id", session.userId).maybeSingle();

  const [peopleRes, taskRes, docRes] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("id, full_name, role, job_title, avatar_url")
      .eq("is_active", true)
      .neq("role", "admin")
      .or(`full_name.ilike.${like},email.ilike.${like}`)
      .limit(6),
    isElevated
      ? supabaseAdmin.from("tasks").select("id, title, status").ilike("title", like).limit(6)
      : supabaseAdmin.from("tasks").select("id, title, status").ilike("title", like).or(`assigned_to.eq.${session.userId},assigned_by.eq.${session.userId}`).limit(6),
    supabaseAdmin
      .from("documents")
      .select("id, title, visibility, owner_id, department_id, team_id")
      .ilike("title", like)
      .limit(20),
  ]);

  const documents = (docRes.data || [])
    .filter((d: any) =>
      isElevated ||
      d.owner_id === session.userId ||
      d.visibility === "company" ||
      (d.visibility === "department" && d.department_id === me?.department_id) ||
      (d.visibility === "team" && d.team_id === me?.team_id)
    )
    .slice(0, 6);

  return NextResponse.json({
    people: peopleRes.data || [],
    tasks: taskRes.data || [],
    documents,
  });
}
