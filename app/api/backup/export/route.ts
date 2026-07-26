// app/api/backup/export/route.ts
// Downloads a full JSON snapshot of every workspace table. Admin/CEO/
// CTO only — this is a complete data export, treat it as sensitive.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

const TABLES = [
  "users", "attendance", "daily_reports", "performance_reviews",
  "departments", "teams", "tasks", "leave_requests", "announcements",
  "documents", "company_settings",
];

export async function GET() {
  const session = await getSession();
  if (!session || !["admin", "ceo", "cto", "coo"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const backup: Record<string, unknown> = { exportedAt: new Date().toISOString(), exportedBy: session.email };
  for (const table of TABLES) {
    const { data, error } = await supabaseAdmin.from(table).select("*");
    backup[table] = error ? { error: error.message } : data;
  }

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="orbit-i-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
