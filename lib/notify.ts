// lib/notify.ts
// One tiny helper, used everywhere something notification-worthy
// happens (task assigned, leave decided, announcement posted, etc.)
// Deliberately fire-and-forget — a failed notification insert should
// never break the action that triggered it.
import { supabaseAdmin } from "@/lib/supabase";

export async function notify(userId: string, title: string, body: string, type = "general", link?: string) {
  try {
    await supabaseAdmin.from("notifications").insert({ user_id: userId, title, body, type, link: link || null });
  } catch {
    // best-effort — never throw from a notification side-effect
  }
}

export async function notifyMany(userIds: string[], title: string, body: string, type = "general", link?: string) {
  const rows = [...new Set(userIds)].map((user_id) => ({ user_id, title, body, type, link: link || null }));
  if (rows.length === 0) return;
  try {
    await supabaseAdmin.from("notifications").insert(rows);
  } catch {
    // best-effort
  }
}

/** Notify everyone holding any of the given roles (e.g. approvers, HR). */
export async function notifyRoles(roles: string[], title: string, body: string, type = "general", link?: string) {
  const { data } = await supabaseAdmin.from("users").select("id").in("role", roles).eq("is_active", true);
  await notifyMany((data || []).map((u) => u.id), title, body, type, link);
}
