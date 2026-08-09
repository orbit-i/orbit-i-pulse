// app/api/profile/2fa/setup/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { generateSecret, generateQrCodeDataUrl } from "@/lib/twofactor";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const secret = generateSecret();
  // Stored but NOT activated until they verify a code (see /enable).
  await supabaseAdmin.from("users").update({ two_factor_secret: secret }).eq("id", session.userId);

  const qrCodeDataUrl = await generateQrCodeDataUrl(session.email, secret);
  return NextResponse.json({ secret, qrCodeDataUrl });
}
