// app/api/documents/route.ts
// Workspace document sharing. Every document has a visibility:
//   private    -> only the owner (+ admin/CEO/CTO/HR Manager)
//   team       -> owner's team_id
//   department -> owner's department_id
//   company    -> everyone
// GET returns everything the signed-in person is allowed to see, tagged
// with its scope, so the UI can group into "My workspace / Team / Dept / Company" tabs.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { canShareCompanyWide } from "@/lib/permissions";

const SELECT = "id, title, description, link_url, storage_path, file_name, file_size, owner_id, department_id, team_id, visibility, created_at, owner:owner_id(full_name, role)";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data: me } = await supabaseAdmin.from("users").select("department_id, team_id").eq("id", session.userId).maybeSingle();
  const isElevated = ["admin", "ceo", "cto", "hr_manager"].includes(session.role);

  // Company-wide docs, everyone sees.
  const { data: companyDocs } = await supabaseAdmin.from("documents").select(SELECT).eq("visibility", "company");

  // Department docs matching my department.
  let deptDocs: any[] = [];
  if (me?.department_id) {
    const { data } = await supabaseAdmin.from("documents").select(SELECT).eq("visibility", "department").eq("department_id", me.department_id);
    deptDocs = data || [];
  }

  // Team docs matching my team.
  let teamDocs: any[] = [];
  if (me?.team_id) {
    const { data } = await supabaseAdmin.from("documents").select(SELECT).eq("visibility", "team").eq("team_id", me.team_id);
    teamDocs = data || [];
  }

  // Private docs: mine always; elevated roles (admin/CEO/CTO/HR) see everyone's for oversight.
  let privateDocs: any[] = [];
  if (isElevated) {
    const { data } = await supabaseAdmin.from("documents").select(SELECT).eq("visibility", "private");
    privateDocs = data || [];
  } else {
    const { data } = await supabaseAdmin.from("documents").select(SELECT).eq("visibility", "private").eq("owner_id", session.userId);
    privateDocs = data || [];
  }

  return NextResponse.json({
    documents: [...privateDocs, ...teamDocs, ...deptDocs, ...(companyDocs || [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  let title: string, description: string | null, linkUrl: string | null, visibility: string;
  let storagePath: string | null = null, fileName: string | null = null, fileSize: number | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    title = String(form.get("title") || "").trim();
    description = (form.get("description") as string) || null;
    visibility = (form.get("visibility") as string) || "private";
    linkUrl = null;
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "File must be under 25MB" }, { status: 400 });

    const ext = file.name.split(".").pop();
    const path = `${session.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext ? `.${ext}` : ""}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabaseAdmin.storage.from("orbit-documents").upload(path, buffer, { contentType: file.type || "application/octet-stream" });
    if (uploadErr) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadErr.message}. Make sure a Storage bucket named "orbit-documents" exists in Supabase (Dashboard → Storage → New bucket).` },
        { status: 500 }
      );
    }
    storagePath = path;
    fileName = file.name;
    fileSize = file.size;
  } else {
    const body = await req.json();
    title = (body.title || "").trim();
    description = body.description || null;
    linkUrl = body.linkUrl || null;
    visibility = body.visibility || "private";
  }

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!linkUrl && !storagePath) return NextResponse.json({ error: "Provide a link or upload a file" }, { status: 400 });
  if (!["private", "team", "department", "company"].includes(visibility)) visibility = "private";
  if (visibility === "company" && !canShareCompanyWide(session.role)) {
    return NextResponse.json({ error: "Only leads, managers, HR, and execs can share company-wide." }, { status: 403 });
  }

  const { data: me } = await supabaseAdmin.from("users").select("department_id, team_id").eq("id", session.userId).maybeSingle();

  const { data, error } = await supabaseAdmin
    .from("documents")
    .insert({
      title,
      description,
      link_url: linkUrl,
      storage_path: storagePath,
      file_name: fileName,
      file_size: fileSize,
      owner_id: session.userId,
      department_id: visibility === "department" ? me?.department_id || null : null,
      team_id: visibility === "team" ? me?.team_id || null : null,
      visibility,
    })
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data });
}
