// lib/notify.ts
// One tiny helper, used everywhere something notification-worthy
// happens (task assigned, leave decided, announcement posted, etc.)
// Deliberately fire-and-forget — a failed notification insert should
// never break the action that triggered it. Also fires an optional
// email (best-effort, only if the person has email notifications on
// and RESEND_API_KEY is configured — otherwise sendEmail no-ops).
import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail, emailTemplate } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

async function maybeEmail(userId: string, title: string, body: string, link?: string) {
  try {
    const { data: user } = await supabaseAdmin.from("users").select("email, full_name, email_notifications").eq("id", userId).maybeSingle();
    if (!user || !user.email_notifications) return;
    await sendEmail(user.email, title, emailTemplate(title, body, "Open in ORBIT-I Pulse", link ? `${APP_URL}${link}` : APP_URL));
  } catch {
    // best-effort
  }
}

export async function notify(userId: string, title: string, body: string, type = "general", link?: string) {
  try {
    await supabaseAdmin.from("notifications").insert({ user_id: userId, title, body, type, link: link || null });
  } catch {
    // best-effort — never throw from a notification side-effect
  }
  maybeEmail(userId, title, body, link);
}

export async function notifyMany(userIds: string[], title: string, body: string, type = "general", link?: string) {
  const ids = [...new Set(userIds)];
  const rows = ids.map((user_id) => ({ user_id, title, body, type, link: link || null }));
  if (rows.length === 0) return;
  try {
    await supabaseAdmin.from("notifications").insert(rows);
  } catch {
    // best-effort
  }
  ids.forEach((id) => maybeEmail(id, title, body, link));
}

/** Notify everyone holding any of the given roles (e.g. approvers, HR). */
export async function notifyRoles(roles: string[], title: string, body: string, type = "general", link?: string) {
  const { data } = await supabaseAdmin.from("users").select("id").in("role", roles).eq("is_active", true);
  await notifyMany((data || []).map((u) => u.id), title, body, type, link);
}
