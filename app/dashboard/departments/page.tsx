// app/dashboard/departments/page.tsx
"use client";
import { useEffect, useState } from "react";
import { BuildingIcon, UsersIcon, NetworkIcon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { ErrorBanner } from "@/components/ui-bits";

type Team = {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  lead_user_id: string | null;
  departmentName: string | null;
  leadName: string | null;
  headcount: number;
};

type Department = {
  id: string;
  name: string;
  description: string | null;
  head_user_id: string | null;
  headName: string | null;
  headcount: number;
};
type Member = { id: string; full_name: string };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", headUserId: "" });
  const [teamForm, setTeamForm] = useState({ name: "", departmentId: "", leadUserId: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [teamSubmitting, setTeamSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [deptRes, teamRes, usersRes] = await Promise.all([fetch("/api/departments"), fetch("/api/teams"), fetch("/api/users")]);
      if (deptRes.ok) {
        setDepartments((await deptRes.json()).departments ?? []);
      } else {
        const d = await deptRes.json().catch(() => ({}));
        setError(d.error || `Couldn't load departments (server returned ${deptRes.status}).`);
      }
      if (teamRes.ok) setTeams((await teamRes.json()).teams ?? []);
      if (usersRes.ok) setMembers((await usersRes.json()).users ?? []);
    } catch (e: any) {
      setError(e.message || "Network error while loading departments.");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createDepartment(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.push("Department name is required.", "error"); return; }
    setSubmitting(true);
    const res = await fetch("/api/departments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSubmitting(false);
    if (res.ok) {
      toast.push("Department created.", "success");
      setForm({ name: "", description: "", headUserId: "" });
      setShowForm(false);
      load();
    } else {
      const d = await res.json();
      toast.push(d.error || "Couldn't create the department.", "error");
    }
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamForm.name.trim()) { toast.push("Team name is required.", "error"); return; }
    setTeamSubmitting(true);
    const res = await fetch("/api/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(teamForm) });
    setTeamSubmitting(false);
    if (res.ok) {
      toast.push("Team created.", "success");
      setTeamForm({ name: "", departmentId: "", leadUserId: "", description: "" });
      setShowTeamForm(false);
      load();
    } else {
      const d = await res.json();
      toast.push(d.error || "Couldn't create the team.", "error");
    }
  }

  async function setTeamLead(teamId: string, leadUserId: string) {
    const res = await fetch(`/api/teams/${teamId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadUserId }) });
    if (res.ok) { toast.push("Team lead updated.", "success"); load(); }
    else toast.push("Couldn't update the team.", "error");
  }

  async function removeTeam(teamId: string) {
    const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
    if (res.ok) { toast.push("Team removed.", "success"); load(); }
    else toast.push("Couldn't remove the team.", "error");
  }

  async function setHead(deptId: string, headUserId: string) {
    const res = await fetch(`/api/departments/${deptId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ headUserId }) });
    if (res.ok) { toast.push("Department head updated.", "success"); load(); }
    else toast.push("Couldn't update the department.", "error");
  }

  return (
    <main className="dash-content fade-up">
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">Engineering, DevOps, AI/ML, Design, HR, Business &amp; Growth — organize the studio by function.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
          <BuildingIcon size={14} />
          {showForm ? "Cancel" : "Add department"}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {showForm && (
        <form onSubmit={createDepartment} className="card" style={{ marginBottom: "1.25rem" }}>
          <div className="card-title">New department</div>
          <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <input className="input" placeholder="Department name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <select className="select" value={form.headUserId} onChange={e => setForm(f => ({ ...f, headUserId: e.target.value }))}>
              <option value="">Department head (optional)</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
            <textarea className="input" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ gridColumn: "1 / -1", minHeight: 60 }} />
          </div>
          <div style={{ marginTop: "0.9rem" }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? "Creating…" : "Create department"}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="card"><div className="skeleton" style={{ height: 200 }} /></div>
      ) : departments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><BuildingIcon size={22} /></div>
            <div className="empty-state-title">No departments yet</div>
            <p className="empty-state-sub">Run migration-3-workspace-expansion.sql to seed the defaults, or add one above.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
          {departments.map(d => (
            <div key={d.id} className="card">
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <BuildingIcon size={16} style={{ color: "var(--color-primary)" }} />
                {d.name}
              </div>
              {d.description && <p className="text-sm text-muted" style={{ marginBottom: "0.75rem" }}>{d.description}</p>}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }} className="text-sm text-muted">
                <UsersIcon size={14} />
                {d.headcount} {d.headcount === 1 ? "member" : "members"}
              </div>
              <label className="text-xs text-muted" style={{ display: "block", marginBottom: "0.3rem" }}>Department head</label>
              <select className="select" style={{ fontSize: "0.82rem" }} value={d.head_user_id || ""} onChange={e => setHead(d.id, e.target.value)}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* ---------- TEAMS (nested under departments) ---------- */}
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginTop: "2rem" }}>
        <div>
          <h1 className="page-title" style={{ fontSize: "1.35rem" }}>Teams</h1>
          <p className="page-subtitle">Smaller working groups inside each department — e.g. "Mobile Team" inside Engineering.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowTeamForm(v => !v)}>
          <NetworkIcon size={14} />
          {showTeamForm ? "Cancel" : "Add team"}
        </button>
      </div>

      {showTeamForm && (
        <form onSubmit={createTeam} className="card" style={{ marginBottom: "1.25rem" }}>
          <div className="card-title">New team</div>
          <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <input className="input" placeholder="Team name" value={teamForm.name} onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))} />
            <select className="select" value={teamForm.departmentId} onChange={e => setTeamForm(f => ({ ...f, departmentId: e.target.value }))}>
              <option value="">Department (optional)</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select className="select" value={teamForm.leadUserId} onChange={e => setTeamForm(f => ({ ...f, leadUserId: e.target.value }))}>
              <option value="">Team lead (optional)</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
            <textarea className="input" placeholder="Description (optional)" value={teamForm.description} onChange={e => setTeamForm(f => ({ ...f, description: e.target.value }))} style={{ gridColumn: "1 / -1", minHeight: 60 }} />
          </div>
          <div style={{ marginTop: "0.9rem" }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={teamSubmitting}>{teamSubmitting ? "Creating…" : "Create team"}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="card"><div className="skeleton" style={{ height: 160 }} /></div>
      ) : teams.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><NetworkIcon size={22} /></div>
            <div className="empty-state-title">No teams yet</div>
            <p className="empty-state-sub">Add one above, or run migration-4-profiles-teams-documents.sql to seed a default "Core Team" per department.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
          {teams.map(t => (
            <div key={t.id} className="card">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                  <NetworkIcon size={16} style={{ color: "var(--color-primary)" }} />
                  {t.name}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => removeTeam(t.id)} title="Remove team">✕</button>
              </div>
              {t.departmentName && <div className="text-xs text-muted" style={{ marginBottom: "0.4rem" }}>{t.departmentName}</div>}
              {t.description && <p className="text-sm text-muted" style={{ marginBottom: "0.75rem" }}>{t.description}</p>}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }} className="text-sm text-muted">
                <UsersIcon size={14} />
                {t.headcount} {t.headcount === 1 ? "member" : "members"}
              </div>
              <label className="text-xs text-muted" style={{ display: "block", marginBottom: "0.3rem" }}>Team lead</label>
              <select className="select" style={{ fontSize: "0.82rem" }} value={t.lead_user_id || ""} onChange={e => setTeamLead(t.id, e.target.value)}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
