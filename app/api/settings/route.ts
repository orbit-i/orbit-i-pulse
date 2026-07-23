// app/api/settings/route.ts
// White-label branding settings (company_settings, single row id=1).
// GET is open to any signed-in person (the sidebar/login page need it
// to render the right name/logo/colors). Only admin/CEO/CTO can PATCH.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data, error } = await supabaseAdmin.from("company_settings").select("*").eq("id", 1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!["admin", "ceo", "cto"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { companyName, logoUrl, primaryColor, secondaryColor, adminEmail } = await req.json();

  const { data: existing } = await supabaseAdmin.from("company_settings").select("*").eq("id", 1).maybeSingle();

  const merged = {
    id: 1,
    company_name: companyName !== undefined ? companyName : existing?.company_name || "ORBIT-I",
    logo_url: logoUrl !== undefined ? (logoUrl || null) : existing?.logo_url ?? null,
    primary_color: primaryColor !== undefined ? primaryColor : existing?.primary_color || "#092F69",
    secondary_color: secondaryColor !== undefined ? secondaryColor : existing?.secondary_color || "#060B18",
    admin_email: adminEmail !== undefined ? adminEmail : existing?.admin_email || session.email,
  };

  const { data, error } = await supabaseAdmin
    .from("company_settings")
    .upsert(merged, { onConflict: "id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
