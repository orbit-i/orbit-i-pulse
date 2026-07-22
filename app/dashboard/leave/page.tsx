// app/dashboard/leave/page.tsx
"use client";
import { useEffect, useState } from "react";
import { PlaneIcon, CheckCircleIcon, AlertIcon } from "@/components/icons";
import { Avatar } from "@/components/ui-bits";
import { useToast } from "@/components/toast";
import { canApproveLeave } from "@/lib/permissions";

type LeaveRequest = {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  review_note: string | null;
  created_at: string;
  requester?: { full_name: string; role: string };
  reviewer?: { full_name: string };
};
type Me = { role: string; userId: string; fullName: string };

const LEAVE_TYPE_LABELS: Record<string, string> = { casual: "Casual", sick: "Sick", annual: "Annual", unpaid: "Unpaid", other: "Other" };

function LeaveStatusBadge({ status }: { status: string }) {
  const variant: Record<string, string> = { pending: "badge-warning", approved: "badge-success", rejected: "badge-danger", cancelled: "badge-neutral" };
  return <span className={`badge ${variant[status] || "badge-neutral"}`}><span className="badge-dot" />{status}</span>;
}

export default function LeavePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<"mine" | "team">("mine");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ leaveType: "casual", startDate: "", endDate: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const canApprove = !!me && canApproveLeave(me.role);

  async function load(scope: "mine" | "team") {
    setLoading(true);
    const [meRes, res] = await Promise.all([
      fetch("/api/auth/me"),
      fetch(`/api/leave${scope === "team" ? "?scope=team" : ""}`),
    ]);
    if (meRes.ok) setMe(await meRes.json());
    if (res.ok) setRequests((await res.json()).leaveRequests ?? []);
    setLoading(false);
  }

  useEffect(() => { load(tab); }, [tab]);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!form.startDate || !form.endDate) { toast.push("Pick a start and end date.", "error"); return; }
    setSubmitting(true);
    const res = await fetch("/api/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSubmitting(false);
    if (res.ok) {
      toast.push("Leave request submitted.", "success");
      setForm({ leaveType: "casual", startDate: "", endDate: "", reason: "" });
      load(tab);
    } else {
      const d = await res.json();
      toast.push(d.error || "Couldn't submit the request.", "error");
    }
  }

  async function act(id: string, status: string) {
    const res = await fetch(`/api/leave/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (res.ok) { toast.push(`Request ${status}.`, "success"); load(tab); }
    else toast.push("Couldn't update the request.", "error");
  }

  function fmt(d: string) { return new Date(d).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" }); }

  return (
    <main className="dash-content fade-up">
      <div className="page-header">
        <h1 className="page-title">Leave &amp; time off</h1>
        <p className="page-subtitle">Request time off, and track or approve your team's requests.</p>
      </div>

      {tab === "mine" && (
        <form onSubmit={submitRequest} className="card" style={{ marginBottom: "1.25rem" }}>
          <div className="card-title">Request time off</div>
          <div className="form-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            <select className="select" value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}>
              {Object.entries(LEAVE_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <input className="input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            <input className="input" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            <textarea className="input" placeholder="Reason (optional)" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={{ gridColumn: "1 / -1", minHeight: 60 }} />
          </div>
          <div style={{ marginTop: "0.9rem" }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? "Submitting…" : "Submit request"}</button>
          </div>
        </form>
      )}

      {canApprove && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.1rem" }}>
          <button className={`btn btn-sm ${tab === "mine" ? "btn-primary" : "btn-outline"}`} onClick={() => setTab("mine")}>My requests</button>
          <button className={`btn btn-sm ${tab === "team" ? "btn-primary" : "btn-outline"}`} onClick={() => setTab("team")}>Team requests</button>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 56 }} />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><PlaneIcon size={22} /></div>
            <div className="empty-state-title">{tab === "team" ? "No requests from your team yet" : "No leave requests yet"}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {requests.map(r => (
              <div key={r.id} className="list-card" style={{ borderRadius: "var(--radius-sm)" }}>
                <div className="list-card-row" style={{ alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    {tab === "team" && r.requester && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                        <Avatar name={r.requester.full_name} size="sm" />
                        <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{r.requester.full_name}</span>
                      </div>
                    )}
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{LEAVE_TYPE_LABELS[r.leave_type] || r.leave_type} leave · {fmt(r.start_date)} – {fmt(r.end_date)}</div>
                    {r.reason && <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>{r.reason}</p>}
                    {r.review_note && <p className="text-xs text-muted" style={{ marginTop: "0.2rem" }}>Note: {r.review_note}</p>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                    <LeaveStatusBadge status={r.status} />
                    {tab === "team" && r.status === "pending" && (
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button className="btn btn-success btn-sm" onClick={() => act(r.id, "approved")}><CheckCircleIcon size={13} />Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => act(r.id, "rejected")}><AlertIcon size={13} />Reject</button>
                      </div>
                    )}
                    {tab === "mine" && r.status === "pending" && (
                      <button className="btn btn-outline btn-sm" onClick={() => act(r.id, "cancelled")}>Cancel</button>
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
