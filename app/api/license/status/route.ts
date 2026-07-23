// app/api/license/status/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { checkLicense } from "@/lib/license";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!["admin", "ceo", "cto"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await checkLicense();
  return NextResponse.json(result);
}
