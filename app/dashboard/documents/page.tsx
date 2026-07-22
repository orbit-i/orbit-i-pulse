// app/dashboard/documents/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { FileTextIcon, UploadIcon, LinkIcon, TrashIcon, DownloadIcon, LockIcon, UsersIcon, BuildingIcon, GlobeIcon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { canShareCompanyWide } from "@/lib/permissions";

type Doc = {
  id: string;
  title: string;
  description: string | null;
  link_url: string | null;
  storage_path: string | null;
  file_name: string | null;
  file_size: number | null;
  owner_id: string;
  visibility: "private" | "team" | "department" | "company";
  created_at: string;
  owner?: { full_name: string; role: string };
};
type Me = { role: string; userId: string };

const TABS = [
  { key: "private", label: "My workspace", icon: LockIcon },
  { key: "team", label: "Team", icon: UsersIcon },
  { key: "department", label: "Department", icon: BuildingIcon },
  { key: "company", label: "Company", icon: GlobeIcon },
] as const;

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("private");
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"link" | "file">("link");
  const [form, setForm] = useState({ title: "", description: "", linkUrl: "", visibility: "private" as Doc["visibility"] });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    const [meRes, docsRes] = await Promise.all([fetch("/api/auth/me"), fetch("/api/documents")]);
    if (meRes.ok) setMe(await meRes.json());
    if (docsRes.ok) setDocs((await docsRes.json()).documents ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.push("Title is required.", "error"); return; }
    if (mode === "link" && !form.linkUrl.trim()) { toast.push("Add a link, or switch to file upload.", "error"); return; }
    if (mode === "file" && !file) { toast.push("Choose a file to upload.", "error"); return; }

    setSubmitting(true);
    let res: Response;
    if (mode === "file" && file) {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("visibility", form.visibility);
      fd.append("file", file);
      res = await fetch("/api/documents", { method: "POST", body: fd });
    } else {
      res = await fetch("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setSubmitting(false);

    if (res.ok) {
      toast.push("Document shared.", "success");
      setForm({ title: "", description: "", linkUrl: "", visibility: "private" });
      setFile(null);
      setShowForm(false);
      load();
    } else {
      const d = await res.json();
      toast.push(d.error || "Couldn't share the document.", "error");
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) { toast.push("Document removed.", "success"); load(); }
    else toast.push("Couldn't remove the document.", "error");
  }

  const visible = docs.filter(d => d.visibility === tab);
  const canCompany = !!me && canShareCompanyWide(me.role);

  return (
    <main className="dash-content fade-up">
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">Your private workspace, plus what's shared with your team, department, and the whole company.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
          <UploadIcon size={14} />
          {showForm ? "Cancel" : "Share a document"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card" style={{ marginBottom: "1.25rem" }}>
          <div className="card-title">Add to your workspace</div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.85rem" }}>
            <button type="button" className={`btn btn-sm ${mode === "link" ? "btn-primary" : "btn-outline"}`} onClick={() => setMode("link")}><LinkIcon size={13} />Paste a link</button>
            <button type="button" className={`btn btn-sm ${mode === "file" ? "btn-primary" : "btn-outline"}`} onClick={() => setMode("file")}><UploadIcon size={13} />Upload a file</button>
          </div>
          <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <input className="input" placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ gridColumn: "1 / -1" }} />
            {mode === "link" ? (
              <input className="input" placeholder="https://drive.google.com/…" value={form.linkUrl} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} style={{ gridColumn: "1 / -1" }} />
            ) : (
              <input ref={fileInput} type="file" className="input" onChange={e => setFile(e.target.files?.[0] || null)} style={{ gridColumn: "1 / -1" }} />
            )}
            <textarea className="input" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ gridColumn: "1 / -1", minHeight: 60 }} />
            <select className="select" style={{ gridColumn: "1 / -1" }} value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value as Doc["visibility"] }))}>
              <option value="private">Private — only me</option>
              <option value="team">My team</option>
              <option value="department">My department</option>
              {canCompany && <option value="company">Whole company</option>}
            </select>
          </div>
          <div style={{ marginTop: "0.9rem" }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? "Sharing…" : "Share"}</button>
          </div>
        </form>
      )}

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.1rem", flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.key} className={`btn btn-sm ${tab === t.key ? "btn-primary" : "btn-outline"}`} onClick={() => setTab(t.key)}>
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FileTextIcon size={22} /></div>
            <div className="empty-state-title">Nothing here yet</div>
            <p className="empty-state-sub">{tab === "private" ? "Your private files and links live here — only you (and leadership/HR) can see them." : `Nothing shared at ${tab} level yet.`}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {visible.map(d => (
              <div key={d.id} className="list-card" style={{ borderRadius: "var(--radius-sm)" }}>
                <div className="list-card-row" style={{ alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0, display: "flex", gap: "0.7rem" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)", background: "color-mix(in srgb, var(--color-primary) 10%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {d.storage_path ? <FileTextIcon size={16} /> : <LinkIcon size={16} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{d.title}</div>
                      {d.description && <p className="text-sm text-muted" style={{ marginTop: "0.2rem" }}>{d.description}</p>}
                      <div className="text-xs text-muted" style={{ marginTop: "0.3rem" }}>
                        {d.owner?.full_name || "Someone"} · {new Date(d.created_at).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}
                        {d.file_name && ` · ${d.file_name} (${formatSize(d.file_size)})`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                    {d.link_url && (
                      <a className="btn btn-outline btn-sm" href={d.link_url} target="_blank" rel="noreferrer"><LinkIcon size={13} />Open</a>
                    )}
                    {d.storage_path && (
                      <a className="btn btn-outline btn-sm" href={`/api/documents/${d.id}/download`} target="_blank" rel="noreferrer"><DownloadIcon size={13} />Download</a>
                    )}
                    {(d.owner_id === me?.userId || ["admin", "ceo", "cto", "hr_manager"].includes(me?.role || "")) && (
                      <button className="btn btn-danger btn-sm" onClick={() => remove(d.id)}><TrashIcon size={13} /></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
