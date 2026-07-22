// app/dashboard/tasks/page.tsx
"use client";
import { useEffect, useState } from "react";
import { BriefcaseIcon, CheckCircleIcon, AlertIcon, SparkIcon } from "@/components/icons";
import { Avatar, RoleBadge } from "@/components/ui-bits";
import { useToast } from "@/components/toast";
import { canAssignTasks } from "@/lib/permissions";

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "blocked" | "done";
  due_date: string | null;
  assigned_to: string;
  assigned_by: string;
  assignee?: { full_name: string; role: string };
  assigner?: { full_name: string; role: string };
};
type Me = { role: string; userId: string; fullName: string };
type Member = { id: string; full_name: string; role: string };

const STATUS_LABELS: Record<string, string> = { todo: "To do", in_progress: "In progress", blocked: "Blocked", done: "Done" };
const STATUS_ORDER = ["todo", "in_progress", "blocked", "done"] as const;
const PRIORITY_COLOR: Record<string, string> = { low: "badge-neutral", medium: "badge-info", high: "badge-warning", urgent: "badge-danger" };

export default function TasksPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<"mine" | "given">("mine");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const canAssign = !!me && canAssignTasks(me.role);

  async function load(scope: "mine" | "given") {
    setLoading(true);
    const [meRes, taskRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch(`/api/tasks${scope === "given" ? "?scope=given" : ""}`),
    ]);
    if (meRes.ok) setMe(await meRes.json());
    if (taskRes.ok) setTasks((await taskRes.json()).tasks ?? []);
    setLoading(false);
  }

  useEffect(() => { load(tab); }, [tab]);

  useEffect(() => {
    if (canAssign) fetch("/api/users").then(r => r.ok ? r.json() : null).then(d => d && setMembers(d.users ?? []));
  }, [canAssign]);

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (res.ok) { toast.push("Task updated.", "success"); load(tab); }
    else toast.push("Couldn't update the task.", "error");
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.assignedTo) { toast.push("Title and assignee are required.", "error"); return; }
    setSubmitting(true);
    const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSubmitting(false);
    if (res.ok) {
      toast.push("Task assigned.", "success");
      setForm({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: "" });
      setShowForm(false);
      load(tab);
    } else {
      const d = await res.json();
      toast.push(d.error || "Couldn't create the task.", "error");
    }
  }

  return (
    <main className="dash-content fade-up">
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">Your assigned work, and anything you've handed out to your team.</p>
        </div>
        {canAssign && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
            <BriefcaseIcon size={14} />
            {showForm ? "Cancel" : "Assign a task"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={createTask} className="card" style={{ marginBottom: "1.25rem" }}>
          <div className="card-title">New task</div>
          <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <input className="input" placeholder="Task title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ gridColumn: "1 / -1" }} />
            <textarea className="input" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ gridColumn: "1 / -1", minHeight: 70 }} />
            <select className="select" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}>
              <option value="">Assign to…</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
            <select className="select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
              <option value="urgent">Urgent</option>
            </select>
            <input className="input" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div style={{ marginTop: "0.9rem" }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? "Assigning…" : "Assign task"}</button>
          </div>
        </form>
      )}

      {canAssign && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.1rem" }}>
          <button className={`btn btn-sm ${tab === "mine" ? "btn-primary" : "btn-outline"}`} onClick={() => setTab("mine")}>My tasks</button>
          <button className={`btn btn-sm ${tab === "given" ? "btn-primary" : "btn-outline"}`} onClick={() => setTab("given")}>Assigned by me</button>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><BriefcaseIcon size={22} /></div>
            <div className="empty-state-title">{tab === "given" ? "You haven't assigned any tasks yet" : "No tasks assigned to you yet"}</div>
            <p className="empty-state-sub">{tab === "given" ? "Use \"Assign a task\" to hand out work." : "Tasks your lead or manager assigns will show up here."}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {tasks.map(t => (
              <div key={t.id} className="list-card" style={{ borderRadius: "var(--radius-sm)" }}>
                <div className="list-card-row" style={{ alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{t.title}</div>
                    {t.description && <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>{t.description}</p>}
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                      <span className={`badge ${PRIORITY_COLOR[t.priority]}`}><span className="badge-dot" />{t.priority}</span>
                      {t.due_date && <span className="text-xs text-muted">Due {new Date(t.due_date).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}</span>}
                      {tab === "given" && t.assignee && <span className="text-xs text-muted">→ {t.assignee.full_name}</span>}
                      {tab === "mine" && t.assigner && <span className="text-xs text-muted">from {t.assigner.full_name}</span>}
                    </div>
                  </div>
                  {tab === "mine" ? (
                    <select
                      className="select"
                      style={{ width: "auto", minWidth: 130, padding: "0.3rem 0.55rem", fontSize: "0.8rem" }}
                      value={t.status}
                      onChange={e => updateStatus(t.id, e.target.value)}
                    >
                      {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  ) : (
                    <span className="badge badge-neutral">{STATUS_LABELS[t.status]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
