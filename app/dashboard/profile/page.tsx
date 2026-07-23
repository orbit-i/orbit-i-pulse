// app/dashboard/profile/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { UserIcon, PhoneIcon, BriefcaseIcon, CameraIcon, MailIcon, BuildingIcon, UsersIcon, LockIcon } from "@/components/icons";
import { RoleBadge, ErrorBanner } from "@/components/ui-bits";
import { useToast } from "@/components/toast";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  avatar_url: string | null;
  role: string;
  departments?: { name: string } | null;
  teams?: { name: string } | null;
  manager?: { full_name: string } | null;
  created_at: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", jobTitle: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const d = await res.json();
        if (!d.profile) {
          setError("Your profile came back empty. Try logging out and back in.");
        } else {
          setProfile(d.profile);
          setForm({ fullName: d.profile.full_name || "", phone: d.profile.phone || "", jobTitle: d.profile.job_title || "" });
        }
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || `Server returned ${res.status}.`);
      }
    } catch (e: any) {
      setError(e.message || "Network error.");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: form.fullName, phone: form.phone, jobTitle: form.jobTitle }),
    });
    setSaving(false);
    if (res.ok) { toast.push("Profile updated.", "success"); load(); }
    else { const d = await res.json(); toast.push(d.error || "Couldn't save your profile.", "error"); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.newPassword.length < 8) { toast.push("New password must be at least 8 characters.", "error"); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.push("New passwords don't match.", "error"); return; }
    setPwSaving(true);
    const res = await fetch("/api/profile/change-password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
    });
    setPwSaving(false);
    if (res.ok) {
      toast.push("Password updated.", "success");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      const d = await res.json();
      toast.push(d.error || "Couldn't update your password.", "error");
    }
  }

  async function uploadAvatar(f: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) { toast.push("Profile picture updated.", "success"); load(); }
    else { const d = await res.json(); toast.push(d.error || "Couldn't upload the picture.", "error"); }
  }

  if (loading) {
    return (
      <main className="dash-content fade-up">
        <div className="card"><div className="skeleton" style={{ height: 220 }} /></div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="dash-content fade-up">
        <div className="page-header">
          <h1 className="page-title">My profile</h1>
        </div>
        <ErrorBanner message={error || "Couldn't load your profile."} />
        <button className="btn btn-outline btn-sm" onClick={load}>Try again</button>
      </main>
    );
  }

  return (
    <main className="dash-content fade-up">
      <div className="page-header">
        <h1 className="page-title">My profile</h1>
        <p className="page-subtitle">Your identity across ORBIT-I Pulse — visible on the org chart, team directory, and everywhere you're mentioned.</p>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="profile-header" style={{ display: "flex", alignItems: "center", gap: "1.1rem" }}>
          <div style={{ position: "relative" }}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} width={72} height={72} style={{ borderRadius: "50%", objectFit: "cover", width: 72, height: 72 }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--color-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 700 }}>
                {profile.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
              </div>
            )}
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              style={{ position: "absolute", bottom: -4, right: -4, width: 28, height: 28, padding: 0, borderRadius: "50%", background: "var(--color-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Change photo"
            >
              <CameraIcon size={13} />
            </button>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </div>
          <div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{profile.full_name}</div>
            <div className="text-sm text-muted">{profile.job_title || "No title set yet"}</div>
            <div style={{ marginTop: "0.4rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <RoleBadge role={profile.role} />
              {profile.departments?.name && <span className="badge badge-neutral"><span className="badge-dot" />{profile.departments.name}</span>}
              {profile.teams?.name && <span className="badge badge-neutral"><span className="badge-dot" />{profile.teams.name}</span>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "1.1rem" }} className="overview-grid">
        <form onSubmit={save} className="card">
          <div className="card-title">Edit your details</div>
          <div className="field">
            <label className="field-label" htmlFor="fullName">Full name</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", display: "flex" }}><UserIcon size={15} /></span>
              <input id="fullName" className="input" style={{ paddingLeft: "2.25rem" }} value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="jobTitle">Designation / job title</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", display: "flex" }}><BriefcaseIcon size={15} /></span>
              <input id="jobTitle" className="input" style={{ paddingLeft: "2.25rem" }} placeholder="e.g. Frontend Developer" value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="phone">Phone number</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", display: "flex" }}><PhoneIcon size={15} /></span>
              <input id="phone" className="input" style={{ paddingLeft: "2.25rem" }} placeholder="+92 3XX XXXXXXX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        </form>

        <div className="card">
          <div className="card-title">Account info</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} className="text-sm">
              <MailIcon size={14} style={{ color: "var(--gray-400)" }} />
              {profile.email}
            </div>
            {profile.departments?.name && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} className="text-sm">
                <BuildingIcon size={14} style={{ color: "var(--gray-400)" }} />
                {profile.departments.name}
              </div>
            )}
            {profile.teams?.name && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} className="text-sm">
                <UsersIcon size={14} style={{ color: "var(--gray-400)" }} />
                {profile.teams.name}
              </div>
            )}
            {profile.manager?.full_name && (
              <div className="text-sm text-muted">Reports to <strong>{profile.manager.full_name}</strong></div>
            )}
            <div className="text-xs text-muted">Member since {new Date(profile.created_at).toLocaleDateString("en-PK", { month: "long", year: "numeric" })}</div>
          </div>
          <hr className="divider mt-md" />
          <p className="text-xs text-muted">
            Role, department, and team are managed by an admin, CEO, CTO, or HR Manager from the Team page.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "1.1rem", maxWidth: 480 }}>
        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <LockIcon size={16} style={{ color: "var(--color-primary)" }} />
          Change password
        </div>
        <form onSubmit={changePassword}>
          <div className="field">
            <label className="field-label" htmlFor="currentPassword">Current password</label>
            <input id="currentPassword" type="password" className="input" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} autoComplete="current-password" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="newPassword">New password</label>
            <input id="newPassword" type="password" className="input" placeholder="At least 8 characters" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} autoComplete="new-password" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="confirmPassword">Confirm new password</label>
            <input id="confirmPassword" type="password" className="input" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} autoComplete="new-password" />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pwSaving}>{pwSaving ? "Updating…" : "Update password"}</button>
        </form>
        <p className="text-xs text-muted" style={{ marginTop: "0.6rem" }}>
          Forgot your current password instead? <a href="/forgot-password" style={{ color: "var(--color-primary)" }}>Reset it here</a> (you'll need to log out first).
        </p>
      </div>
    </main>
  );
}
