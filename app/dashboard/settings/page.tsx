// app/dashboard/settings/page.tsx
"use client";
import { useEffect, useState } from "react";
import { ShieldIcon, SparkIcon } from "@/components/icons";
import { useToast } from "@/components/toast";

type Settings = {
  company_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  admin_email: string;
};
type LicenseStatus =
  | { valid: true; payload: { licensedTo: string; licenseId: string; issuedAt: string; plan: string } }
  | { valid: false; reason: string };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function load() {
    setLoading(true);
    const [settingsRes, licenseRes] = await Promise.all([fetch("/api/settings"), fetch("/api/license/status")]);
    if (settingsRes.ok) {
      const d = await settingsRes.json();
      setSettings(
        d.settings || { company_name: "ORBIT-I", logo_url: null, primary_color: "#092F69", secondary_color: "#060B18", admin_email: "" }
      );
    }
    if (licenseRes.ok) setLicense(await licenseRes.json());
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
        primaryColor: settings.primary_color,
        secondaryColor: settings.secondary_color,
        adminEmail: settings.admin_email,
      }),
    });
    setSaving(false);
    if (res.ok) { toast.push("Branding updated.", "success"); load(); }
    else { const d = await res.json(); toast.push(d.error || "Couldn't save settings.", "error"); }
  }

  if (loading || !settings) {
    return (
      <main className="dash-content fade-up">
        <div className="card"><div className="skeleton" style={{ height: 220 }} /></div>
      </main>
    );
  }

  const isInternal = license && "payload" in license && license.payload.plan === "internal";

  return (
    <main className="dash-content fade-up">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">White-label branding for this deployment, and its license status.</p>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem", maxWidth: 520 }}>
        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ShieldIcon size={16} style={{ color: "var(--color-primary)" }} />
          License
        </div>
        {license?.valid ? (
          <div>
            <span className="badge badge-success" style={{ marginBottom: "0.6rem" }}><span className="badge-dot" />{isInternal ? "Internal / unlicensed use" : "Active license"}</span>
            {!isInternal && "payload" in license && (
              <div className="text-sm text-muted" style={{ marginTop: "0.4rem" }}>
                Licensed to <strong>{license.payload.licensedTo}</strong> · plan: {license.payload.plan} · issued {new Date(license.payload.issuedAt).toLocaleDateString()}
              </div>
            )}
            {isInternal && (
              <p className="text-xs text-muted" style={{ marginTop: "0.4rem" }}>
                No LICENSE_PUBLIC_KEY is configured, so this deployment runs unrestricted — normal for your own internal use.
                Set LICENSE_PUBLIC_KEY + LICENSE_KEY when you sell this as a white-label product to a client.
              </p>
            )}
          </div>
        ) : (
          <div>
            <span className="badge badge-danger" style={{ marginBottom: "0.6rem" }}><span className="badge-dot" />Invalid license</span>
            <p className="text-sm text-muted">{license && !license.valid ? license.reason : "Unknown license status."}</p>
          </div>
        )}
      </div>

      <form onSubmit={save} className="card" style={{ maxWidth: 520 }}>
        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <SparkIcon size={16} style={{ color: "var(--color-primary)" }} />
          White-label branding
        </div>
        <div className="field">
          <label className="field-label" htmlFor="companyName">Company name</label>
          <input id="companyName" className="input" value={settings.company_name} onChange={e => setSettings(s => s && { ...s, company_name: e.target.value })} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="logoUrl">Logo URL</label>
          <input id="logoUrl" className="input" placeholder="https://…/logo.png" value={settings.logo_url || ""} onChange={e => setSettings(s => s && { ...s, logo_url: e.target.value })} />
        </div>
        <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div className="field">
            <label className="field-label" htmlFor="primaryColor">Primary color</label>
            <input id="primaryColor" type="color" className="input" style={{ height: 42, padding: 4 }} value={settings.primary_color} onChange={e => setSettings(s => s && { ...s, primary_color: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="secondaryColor">Secondary color</label>
            <input id="secondaryColor" type="color" className="input" style={{ height: 42, padding: 4 }} value={settings.secondary_color} onChange={e => setSettings(s => s && { ...s, secondary_color: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="adminEmail">Support / admin email</label>
          <input id="adminEmail" type="email" className="input" value={settings.admin_email} onChange={e => setSettings(s => s && { ...s, admin_email: e.target.value })} />
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? "Saving…" : "Save branding"}</button>
        <p className="text-xs text-muted" style={{ marginTop: "0.6rem" }}>
          These values are stored per-deployment — each client you sell to can set their own name, logo, and colors without touching code.
        </p>
      </form>
    </main>
  );
}
