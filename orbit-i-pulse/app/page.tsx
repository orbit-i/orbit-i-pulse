// app/page.tsx — Landing / splash redirect
// Simple redirect: authenticated users go to /dashboard, others to /login.
// We do this on the server to avoid a flash of the wrong UI.
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Root() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  redirect("/login");
}
