// lib/email.ts
// =============================================================
// EMAIL NOTIFICATIONS — via Resend (https://resend.com), free tier
// covers small teams easily. Uses plain fetch (no SDK dependency).
//
// Setup: sign up at resend.com, verify a sending domain (or use their
// shared onboarding domain for testing), then set these env vars:
//   RESEND_API_KEY=re_xxxxx
//   EMAIL_FROM="ORBIT-I Pulse <notifications@yourdomain.com>"
// If RESEND_API_KEY is not set, sendEmail() silently no-ops — email
// is an OPTIONAL enhancement, the app works fully without it.
// =============================================================

export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { skipped: true };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "ORBIT-I Pulse <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Email send failed:", text);
      return { error: text };
    }
    return { ok: true };
  } catch (e: any) {
    console.error("Email send error:", e.message);
    return { error: e.message };
  }
}

export function emailTemplate(title: string, body: string, ctaLabel?: string, ctaUrl?: string) {
  return `
  <div style="font-family: -apple-system, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
    <div style="background: #092F69; color: #fff; padding: 16px 20px; border-radius: 10px 10px 0 0; font-weight: 700; font-size: 15px;">
      ORBIT-I Pulse
    </div>
    <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px; padding: 20px;">
      <h2 style="font-size: 16px; margin: 0 0 8px;">${title}</h2>
      <p style="font-size: 14px; color: #475569; line-height: 1.6;">${body}</p>
      ${ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:12px;background:#092F69;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none;font-size:13px;">${ctaLabel || "Open"}</a>` : ""}
    </div>
    <p style="font-size: 11px; color: #94a3b8; margin-top: 12px;">You're receiving this because you have email notifications enabled in ORBIT-I Pulse Settings.</p>
  </div>`;
}
