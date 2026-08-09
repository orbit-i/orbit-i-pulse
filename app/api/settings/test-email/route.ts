// app/api/settings/test-email/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendEmail, emailTemplate } from "@/lib/email";

const ALLOWED = ["admin", "founder", "co_founder", "ceo", "cto", "coo"];

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!ALLOWED.includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY isn't set. Add it in Vercel → Settings → Environment Variables, then redeploy." },
      { status: 400 }
    );
  }

  const result = await sendEmail(
    session.email,
    "Test email from ORBIT-I Pulse",
    emailTemplate("It works", "This confirms your email notifications are configured correctly.")
  );

  if ((result as any).error) {
    return NextResponse.json({ error: `Resend rejected the request: ${(result as any).error}` }, { status: 400 });
  }

  return NextResponse.json({ ok: true, sentTo: session.email });
}
