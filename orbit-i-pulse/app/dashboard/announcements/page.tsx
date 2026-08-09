// app/dashboard/announcements/page.tsx
"use client";
import { useEffect, useState } from "react";
import { MegaphoneIcon } from "@/components/icons";
import { Avatar, RoleBadge } from "@/components/ui-bits";
import { useToast } from "@/components/toast";
import { canPostAnnouncements } from "@/lib/permissions";

type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  poster?: { full_name: string; role: string };
  departments?: { name: string } | null;
};
type Me = { role: string };

export default function AnnouncementsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "" });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const canPost = !!me && canPostAnnouncements(me.role);

  async function load() {
    setLoading(true);
    const [meRes, res] = await Promise.all([fetch("/api/auth/me"), fetch("/api/announcements")]);
    if (meRes.ok) setMe(await meRes.json());
    if (res.ok) setItems((await res.json()).announcements ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) { toast.push("Title and message are required.", "error"); return; }
    setSubmitting(true);
    const res = await fetch("/api/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSubmitting(false);
    if (res.ok) {
      toast.push("Announcement posted.", "success");
      setForm({ title: "", body: "" });
      setShowForm(false);
      load();
    } else {
      const d = await res.json();
      toast.push(d.error || "Couldn't post the announcement.", "error");
    }
  }

  function fmt(d: string) { return new Date(d).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }); }

  return (
    <main className="dash-content fade-up">
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Company-wide updates from leadership and HR.</p>
        </div>
        {canPost && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
            <MegaphoneIcon size={14} />
            {showForm ? "Cancel" : "New announcement"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={post} className="card" style={{ marginBottom: "1.25rem" }}>
          <div className="card-title">Post to the whole company</div>
          <input className="input" placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ marginBottom: "0.6rem" }} />
          <textarea className="input" placeholder="Message" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} style={{ minHeight: 100 }} />
          <div style={{ marginTop: "0.9rem" }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? "Posting…" : "Post announcement"}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="card"><div className="skeleton" style={{ height: 160 }} /></div>
      ) : items.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><MegaphoneIcon size={22} /></div>
            <div className="empty-state-title">No announcements yet</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {items.map(a => (
            <div key={a.id} className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <div className="card-title" style={{ marginBottom: 0 }}>{a.title}</div>
                <span className="text-xs text-muted">{fmt(a.created_at)}</span>
              </div>
              <p className="text-sm" style={{ whiteSpace: "pre-wrap", marginBottom: "0.75rem" }}>{a.body}</p>
              {a.poster && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Avatar name={a.poster.full_name} size="sm" />
                  <span className="text-sm" style={{ fontWeight: 600 }}>{a.poster.full_name}</span>
                  <RoleBadge role={a.poster.role} />
                  {a.departments?.name && <span className="badge badge-neutral"><span className="badge-dot" />{a.departments.name}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
