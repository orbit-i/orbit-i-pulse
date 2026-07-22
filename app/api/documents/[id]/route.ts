// app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data: doc } = await supabaseAdmin.from("documents").select("owner_id, storage_path").eq("id", params.id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const isElevated = ["admin", "ceo", "cto", "hr_manager"].includes(session.role);
  if (doc.owner_id !== session.userId && !isElevated) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (doc.storage_path) await supabaseAdmin.storage.from("orbit-documents").remove([doc.storage_path]);
  const { error } = await supabaseAdmin.from("documents").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
