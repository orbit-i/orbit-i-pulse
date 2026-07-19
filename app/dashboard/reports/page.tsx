// app/dashboard/reports/page.tsx
"use client";
import { useEffect, useState } from "react";
import { FileTextIcon, DownloadIcon, StarIcon, CheckCircleIcon, SparkIcon } from "@/components/icons";
import { StarDisplay, StatusBadge, Avatar } from "@/components/ui-bits";
import { useToast } from "@/components/toast";

type Review = { rating: number; feedback: string | null; reviewer_id: string; created_at: string };
type Report = {
  id: string;
  report_date: string;
  tasks_completed: string;
  blockers: string | null;
  hours_spent: number | null;
  status: "pending" | "reviewed";
  users?: { full_name: string };
  performance_reviews?: Review[];
};
type Me = { role: string; userId: string; fullName: string };

export default function ReportsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksCompleted, setTasksCompleted] = useState("");
  const [blockers, setBlockers] = useState("");
  const [hoursSpent, setHoursSpent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<{ rating: number; notes: string }>({ rating: 5, notes: "" });
  const toast = useToast();

  const isAdminOrManager = me?.role === "admin" || me?.role === "manager";

  async function load() {
    setLoading(true);
    const [meRes, rptRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/reports"),
    ]);
    if (meRes.ok) setMe(await meRes.json());
    if (rptRes.ok) {
      const d = await rptRes.json();
      setReports(Array.isArray(d) ? d : d.reports ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!tasksCompleted.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tasksCompleted: tasksCompleted.trim(),
        blockers: blockers.trim() || undefined,
        hoursSpent: hoursSpent ? Number(hoursSpent) : undefined,
      }),
    });
    if (res.ok) {
      toast.push("Report submitted!", "success");
      setTasksCompleted("");
      setBlockers("");
      setHoursSpent("");
      await load();
    } else {
      const d = await res.json();
      toast.push(d.error || "Failed to submit report.", "error");
    }
    setSubmitting(false);
  }

  async function submitReview(reportId: string) {
    const res = await fetch(`/api/reports/${reportId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: reviewData.rating, feedback: reviewData.notes || undefined }),
    });
    if (res.ok) {
      toast.push("Review saved!", "success");
      setReviewing(null);
      await load();
    } else {
      const d = await res.json();
      toast.push(d.error || "Failed to save review.", "error");
    }
  }

  async function exportCSV() {
    const res = await fetch("/api/reports/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reports-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <main className="dash-content fade-up">
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">Daily Reports</h1>
          <p className="page-subtitle">{isAdminOrManager ? "Review your team's daily progress reports." : "Submit and track your daily work reports."}</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={exportCSV}>
          <DownloadIcon size={14} />
          Export CSV
        </button>
      </div>

      {/* Submit form (non-admin only) */}
      {!isAdminOrManager && (
        <div className="card" style={{ marginBottom: "1.25rem" }}>
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileTextIcon size={16} style={{ color: "var(--color-primary)" }} />
            Submit today's report
          </div>
          <p className="card-subtitle">What did you work on today? Be specific — your manager will review this.</p>
          <form onSubmit={submitReport}>
            <div className="field" style={{ marginBottom: "0.9rem" }}>
              <label className="field-label">Tasks completed</label>
              <textarea
                className="textarea"
                placeholder="e.g. Completed the login page UI, fixed 3 bugs in the API, reviewed PR #42…"
                value={tasksCompleted}
                onChange={e => setTasksCompleted(e.target.value)}
                required
                rows={4}
                style={{ minHeight: 110 }}
              />
            </div>
            <div className="field" style={{ marginBottom: "0.9rem" }}>
              <label className="field-label">Blockers <span className="text-muted">(optional)</span></label>
              <textarea
                className="textarea"
                placeholder="Anything slowing you down? Leave blank if none."
                value={blockers}
                onChange={e => setBlockers(e.target.value)}
                rows={2}
                style={{ minHeight: 60 }}
              />
            </div>
            <div className="field" style={{ marginBottom: "0.9rem", maxWidth: 200 }}>
              <label className="field-label">Hours spent <span className="text-muted">(optional)</span></label>
              <input
                type="number"
                className="input"
                placeholder="e.g. 7.5"
                min={0}
                max={24}
                step={0.25}
                value={hoursSpent}
                onChange={e => setHoursSpent(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting || !tasksCompleted.trim()}>
              <FileTextIcon size={14} />
              {submitting ? "Submitting…" : "Submit report"}
            </button>
          </form>
        </div>
      )}

      {/* Reports list */}
      <div className="card">
        <div className="card-title">
          {isAdminOrManager ? "All team reports" : "Your reports"}
        </div>
        <div className="card-subtitle">
          {isAdminOrManager ? "Click 'Review' to rate a pending report." : "Your submitted daily reports and manager feedback."}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FileTextIcon size={22} /></div>
            <div className="empty-state-title">No reports yet</div>
            <p className="empty-state-sub">{isAdminOrManager ? "Your team hasn't submitted any reports yet." : "Submit your first daily report above."}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "0.25rem" }}>
            {reports.map(r => {
              const review = r.performance_reviews?.[0];
              return (
                <div key={r.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "1.1rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.65rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
                      {isAdminOrManager && r.users?.full_name && (
                        <>
                          <Avatar name={r.users.full_name} size="sm" />
                          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{r.users.full_name}</span>
                          <span style={{ color: "var(--gray-300)" }}>·</span>
                        </>
                      )}
                      <span className="text-sm text-muted">{fmtDate(r.report_date)}</span>
                      <StatusBadge status={r.status} />
                      {review && <StarDisplay rating={review.rating} />}
                    </div>
                    {isAdminOrManager && r.status === "pending" && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => { setReviewing(r.id); setReviewData({ rating: 5, notes: "" }); }}
                      >
                        <StarIcon size={13} />
                        Review
                      </button>
                    )}
                  </div>

                  <p className="text-sm" style={{ marginTop: "0.6rem", color: "var(--gray-700)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {r.tasks_completed}
                  </p>

                  {r.blockers && (
                    <div style={{ marginTop: "0.5rem", fontSize: "0.83rem", color: "var(--gray-600)" }}>
                      <span style={{ fontWeight: 700 }}>Blockers: </span>
                      {r.blockers}
                    </div>
                  )}

                  {r.hours_spent != null && (
                    <div style={{ marginTop: "0.35rem", fontSize: "0.8rem", color: "var(--gray-500)" }}>
                      {r.hours_spent}h logged
                    </div>
                  )}

                  {review?.feedback && (
                    <div style={{ marginTop: "0.65rem", background: "var(--info-bg)", borderRadius: "var(--radius-sm)", padding: "0.6rem 0.8rem", fontSize: "0.83rem", color: "var(--gray-700)", lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 700, color: "#2563eb" }}>Manager notes: </span>
                      {review.feedback}
                    </div>
                  )}

                  {/* Inline review form */}
                  {reviewing === r.id && (
                    <div style={{ marginTop: "0.9rem", background: "var(--surface-muted)", borderRadius: "var(--radius-sm)", padding: "1rem", border: "1px solid var(--border)" }}>
                      <div style={{ marginBottom: "0.75rem" }}>
                        <label className="field-label">Performance rating</label>
                        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.3rem" }}>
                          {[1,2,3,4,5].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setReviewData(d => ({ ...d, rating: n }))}
                              style={{
                                background: "none", border: "none", cursor: "pointer", padding: "2px",
                                color: n <= reviewData.rating ? "#f59e0b" : "var(--gray-300)",
                                transition: "color 0.1s",
                              }}
                              aria-label={`${n} stars`}
                            >
                              <StarIcon size={22} filled={n <= reviewData.rating} />
                            </button>
                          ))}
                          <span className="text-sm text-muted" style={{ alignSelf: "center", marginLeft: "0.4rem" }}>{reviewData.rating}/5</span>
                        </div>
                      </div>
                      <div className="field">
                        <label className="field-label">Manager notes (optional)</label>
                        <textarea
                          className="textarea"
                          rows={2}
                          style={{ minHeight: 68 }}
                          placeholder="Great work on the API fixes…"
                          value={reviewData.notes}
                          onChange={e => setReviewData(d => ({ ...d, notes: e.target.value }))}
                        />
                      </div>
                      <div style={{ display: "flex", gap: "0.65rem" }}>
                        <button className="btn btn-primary btn-sm" onClick={() => submitReview(r.id)}>
                          <CheckCircleIcon size={13} />
                          Submit review
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setReviewing(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
