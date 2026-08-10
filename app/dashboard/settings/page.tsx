// app/dashboard/settings/page.tsx
"use client";
import { useEffect, useState } from "react";
import { appConfig } from "@/config";
import { ShieldIcon, SparkIcon, DownloadIcon, MailIcon, CheckCircleIcon, AlertIcon, GlobeIcon, PhoneIcon } from "@/components/icons";
import { useLanguage } from "@/components/language-provider";
import { LANGUAGES } from "@/lib/i18n";
import { useToast } from "@/components/toast";

type Settings = {
  company_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  tagline: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  admin_email: string;
  support_phone: string | null;
  website_url: string | null;
};
const DEFAULT_SETTINGS: Settings = {
  company_name: "ORBIT-I", logo_url: null, favicon_url: null, tagline: null,
  primary_color: "#092F69", secondary_color: "#060B18", accent_color: "#0d7d6c",
  admin_email: "", support_phone: null, website_url: null,
};

export default function SettingsPage() {
  const { lang, setLang } = useLanguage();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const toast = useToast();

  async function load() {
    setLoading(true);
    const settingsRes = await fetch("/api/settings");
    if (settingsRes.ok) {
      const d = await settingsRes.json();
      setSettings(d.settings || DEFAULT_SETTINGS);
      setEmailConfigured(!!d.emailConfigured);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: settings.company_name,
        logoUrl: settings.logo_url,
        faviconUrl: settings.favicon_url,
        tagline: settings.tagline,
        primaryColor: settings.primary_color,
        secondaryColor: settings.secondary_color,
        accentColor: settings.accent_color,
        adminEmail: settings.admin_email,
        supportPhone: settings.support_phone,
        websiteUrl: settings.website_url,
      }),
    });
    setSaving(false);
    if (res.ok) { toast.push("Branding updated.", "success"); load(); }
    else { const d = await res.json(); toast.push(d.error || "Couldn't save settings.", "error"); }
  }

  async function sendTestEmail() {
    setTestingEmail(true);
    const res = await fetch("/api/settings/test-email", { method: "POST" });
    const d = await res.json();
    setTestingEmail(false);
    if (res.ok) toast.push(`Test email sent to ${d.sentTo}. Check your inbox.`, "success");
    else toast.push(d.error || "Couldn't send the test email.", "error");
  }

  if (loading || !settings) {
    return (
      <main className="dash-content fade-up">
        <div className="settings-grid">
          {[1, 2, 3, 4].map(i => <div key={i} className="card"><div className="skeleton" style={{ height: 160 }} /></div>)}
        </div>
      </main>
    );
  }

  return (
    <main className="dash-content fade-up">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Everything that defines this deployment — branding, language, email, and backups.</p>
      </div>

      <div className="settings-grid">
        {/* ---------- BRANDING (spans full width, the main event) ---------- */}
        <form onSubmit={save} className="card settings-span-2">
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <SparkIcon size={16} style={{ color: "var(--color-primary)" }} />
            White-label branding
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: "1rem" }}>What every client sees — no code changes needed.</p>

          <div className="settings-brand-preview" style={{ background: settings.secondary_color }}>
            <div className="settings-brand-preview-inner" style={{ borderColor: settings.primary_color }}>
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 8, background: settings.primary_color }} />
              )}
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>{settings.company_name || "Your Company"}</div>
                {settings.tagline && <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.75rem" }}>{settings.tagline}</div>}
              </div>
            </div>
          </div>

          <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem", marginTop: "1.1rem" }}>
            <div className="field">
              <label className="field-label" htmlFor="companyName">Company name</label>
              <input id="companyName" className="input" value={settings.company_name} onChange={e => setSettings(s => s && { ...s, company_name: e.target.value })} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="tagline">Tagline</label>
              <input id="tagline" className="input" placeholder="e.g. Building Ideas. Creating Impact." value={settings.tagline || ""} onChange={e => setSettings(s => s && { ...s, tagline: e.target.value })} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="logoUrl">Logo URL</label>
              <input id="logoUrl" className="input" placeholder="https://…/logo.png" value={settings.logo_url || ""} onChange={e => setSettings(s => s && { ...s, logo_url: e.target.value })} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="faviconUrl">Favicon URL</label>
              <input id="faviconUrl" className="input" placeholder="https://…/favicon.ico" value={settings.favicon_url || ""} onChange={e => setSettings(s => s && { ...s, favicon_url: e.target.value })} />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="primaryColor">Primary color</label>
              <div className="settings-color-row">
                <input id="primaryColor" type="color" value={settings.primary_color} onChange={e => setSettings(s => s && { ...s, primary_color: e.target.value })} />
                <span className="text-xs text-muted">{settings.primary_color}</span>
              </div>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="secondaryColor">Secondary color</label>
              <div className="settings-color-row">
                <input id="secondaryColor" type="color" value={settings.secondary_color} onChange={e => setSettings(s => s && { ...s, secondary_color: e.target.value })} />
                <span className="text-xs text-muted">{settings.secondary_color}</span>
              </div>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="accentColor">Accent color</label>
              <div className="settings-color-row">
                <input id="accentColor" type="color" value={settings.accent_color} onChange={e => setSettings(s => s && { ...s, accent_color: e.target.value })} />
                <span className="text-xs text-muted">{settings.accent_color}</span>
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="adminEmail">Support / admin email</label>
              <input id="adminEmail" type="email" className="input" value={settings.admin_email} onChange={e => setSettings(s => s && { ...s, admin_email: e.target.value })} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="supportPhone">Support phone</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.7rem", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", display: "flex" }}><PhoneIcon size={14} /></span>
                <input id="supportPhone" className="input" style={{ paddingLeft: "2rem" }} placeholder="+92 3XX XXXXXXX" value={settings.support_phone || ""} onChange={e => setSettings(s => s && { ...s, support_phone: e.target.value })} />
              </div>
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="field-label" htmlFor="websiteUrl">Website</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.7rem", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", display: "flex" }}><GlobeIcon size={14} /></span>
                <input id="websiteUrl" className="input" style={{ paddingLeft: "2rem" }} placeholder="https://yourcompany.com" value={settings.website_url || ""} onChange={e => setSettings(s => s && { ...s, website_url: e.target.value })} />
              </div>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: "0.9rem" }} disabled={saving}>{saving ? "Saving…" : "Save branding"}</button>
        </form>

        {/* ---------- EMAIL ---------- */}
        <div className="card">
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MailIcon size={16} style={{ color: "var(--color-primary)" }} />
            Email notifications
          </div>
          {emailConfigured ? (
            <span className="badge badge-success" style={{ marginBottom: "0.7rem" }}><CheckCircleIcon size={12} />Configured</span>
          ) : (
            <span className="badge badge-warning" style={{ marginBottom: "0.7rem" }}><AlertIcon size={12} />Not configured</span>
          )}
          {emailConfigured ? (
            <>
              <p className="text-sm text-muted" style={{ marginBottom: "0.7rem" }}>Task, leave, and announcement notifications are also sent by email.</p>
              <button className="btn btn-outline btn-sm" onClick={sendTestEmail} disabled={testingEmail}>{testingEmail ? "Sending…" : "Send test email"}</button>
            </>
          ) : (
            <div>
              <p className="text-sm text-muted" style={{ marginBottom: "0.6rem" }}>In-app notifications work fine without this — email is optional. To enable it:</p>
              <ol className="text-sm text-muted" style={{ paddingLeft: "1.1rem", marginBottom: "0.6rem" }}>
                <li>Sign up free at <strong>resend.com</strong></li>
                <li>Copy your API key</li>
                <li>In Vercel → Settings → Environment Variables, add <code>RESEND_API_KEY</code></li>
                <li>Redeploy</li>
              </ol>
            </div>
          )}
        </div>

        {/* ---------- LANGUAGE ---------- */}
        <div className="card">
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <GlobeIcon size={16} style={{ color: "var(--color-primary)" }} />
            Language
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: "0.7rem" }}>Navigation and common labels (more pages rolling out).</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {LANGUAGES.map((l) => (
              <button key={l.code} type="button" className={`btn btn-sm ${lang === l.code ? "btn-primary" : "btn-outline"}`} onClick={() => setLang(l.code)}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---------- DEVELOPED BY ---------- */}
        <div className="card">
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ShieldIcon size={16} style={{ color: "var(--color-primary)" }} />
            Developed by
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>ORBIT-I (Private) Limited</div>
          <p className="text-sm text-muted" style={{ marginTop: "0.4rem" }}>This platform is built and maintained by ORBIT-I (Private) Limited.</p>
        </div>

        {/* ---------- LEGAL ENTITY ---------- */}
        <div className="card">
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ShieldIcon size={16} style={{ color: "var(--color-primary)" }} />
            Legal entity
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{appConfig.legalName}</div>
          <span className="badge badge-success" style={{ marginTop: "0.5rem" }}><span className="badge-dot" />{appConfig.registrationTag}</span>
        </div>

        {/* ---------- BACKUP ---------- */}
        <div className="card">
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <DownloadIcon size={16} style={{ color: "var(--color-primary)" }} />
            Backup &amp; data export
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: "0.7rem" }}>Full JSON snapshot of every table — keep somewhere safe.</p>
          <a href="/api/backup/export" className="btn btn-outline btn-sm" download>
            <DownloadIcon size={14} />
            Download full backup
          </a>
        </div>
      </div>
    </main>
  );
}
