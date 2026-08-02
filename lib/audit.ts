// lib/audit.ts
// Records who-did-what for admin-significant actions (role changes,
// deletions, department/team structure, settings/branding, licensing).
// Deliberately NOT used for every click (tasks, chat, attendance) —
// that would make the log too noisy to be useful. Fire-and-forget,
// same pattern as notify().
import { supabaseAdmin } from "@/lib/supabase";

export async function logActivity(
  actorId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  meta?: Record<string, unknown>
) {
  try {
    await supabaseAdmin.from("activity_log").insert({
      actor_id: actorId,
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      meta: meta || null,
    });
  } catch {
    // best-effort — never break the action that triggered this
  }
}
