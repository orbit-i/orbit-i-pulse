// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("users")
    .select("full_name, job_title, department_id, manager_id, avatar_url, departments!fk_users_department(name)")
    .eq("id", session.userId)
    .maybeSingle();

  return NextResponse.json({
    role: session.role,
    email: session.email,
    userId: session.userId,
    fullName: data?.full_name || session.email,
    jobTitle: data?.job_title || null,
    departmentId: data?.department_id || null,
    departmentName: (data as any)?.departments?.name || null,
    managerId: data?.manager_id || null,
    avatarUrl: data?.avatar_url || null,
  });
}
