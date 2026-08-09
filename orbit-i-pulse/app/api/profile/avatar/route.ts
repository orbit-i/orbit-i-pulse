// app/api/profile/avatar/route.ts
// Profile picture upload. Uses a PUBLIC Supabase Storage bucket
// ("orbit-avatars") so the returned URL works directly in <img src>
// everywhere in the app (sidebar, team page, org chart) without needing
// a signed-URL proxy. Unlike shared documents, avatars aren't sensitive.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Please upload an image file" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${session.userId}/avatar-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await supabaseAdmin.storage.from("orbit-avatars").upload(path, buffer, { contentType: file.type, upsert: true });
  if (uploadErr) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadErr.message}. Make sure a PUBLIC Storage bucket named "orbit-avatars" exists in Supabase.` },
      { status: 500 }
    );
  }

  const { data: pub } = supabaseAdmin.storage.from("orbit-avatars").getPublicUrl(path);
  await supabaseAdmin.from("users").update({ avatar_url: pub.publicUrl }).eq("id", session.userId);

  return NextResponse.json({ avatarUrl: pub.publicUrl });
}
