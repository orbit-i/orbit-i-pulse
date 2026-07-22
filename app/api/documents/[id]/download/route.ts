// app/api/documents/[id]/download/route.ts
// Generates a short-lived signed URL for a stored file and redirects to
// it. Access control lives here too — visibility rules are re-checked
// on every download, not just at list time.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data: doc } = await supabaseAdmin.from("documents").select("*").eq("id", params.id).maybeSingle();
  if (!doc || !doc.storage_path) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const { data: me } = await supabaseAdmin.from("users").select("department_id, team_id, role").eq("id", session.userId).maybeSingle();
  const isElevated = ["admin", "ceo", "cto", "hr_manager"].includes(session.role);

  const allowed =
    doc.owner_id === session.userId ||
    isElevated ||
    (doc.visibility === "company") ||
    (doc.visibility === "department" && doc.department_id && doc.department_id === me?.department_id) ||
    (doc.visibility === "team" && doc.team_id && doc.team_id === me?.team_id);

  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: signed, error } = await supabaseAdmin.storage.from("orbit-documents").createSignedUrl(doc.storage_path, 60);
  if (error || !signed) return NextResponse.json({ error: error?.message || "Couldn't generate a download link" }, { status: 500 });

  return NextResponse.redirect(signed.signedUrl);
}
