// app/api/attendance/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireRole("admin", "manager");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // YYYY-MM-DD
  const to = searchParams.get("to");

  let query = supabaseAdmin
    .from("attendance")
    .select("check_in, check_out, check_in_ip, check_out_ip, status, users:user_id(full_name, email, manager_id)")
    .order("check_in", { ascending: false });

  if (from) query = query.gte("check_in", `${from}T00:00:00`);
  if (to) query = query.lte("check_in", `${to}T23:59:59`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Managers only see their own team's rows
  const filtered = session.role === "manager"
    ? (data || []).filter((r: any) => r.users?.manager_id === session.userId)
    : data || [];

  const rows = filtered.map((r: any) => ({
    name: r.users?.full_name,
    email: r.users?.email,
    check_in: r.check_in,
    check_out: r.check_out,
    check_in_ip: r.check_in_ip,
    check_out_ip: r.check_out_ip,
    status: r.status,
  }));

  const csv = toCsv(rows, [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "check_in", label: "Check In" },
    { key: "check_out", label: "Check Out" },
    { key: "check_in_ip", label: "Check In IP" },
    { key: "check_out_ip", label: "Check Out IP" },
    { key: "status", label: "Status" },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="attendance-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
