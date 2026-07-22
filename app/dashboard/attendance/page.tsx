// app/dashboard/attendance/page.tsx
"use client";
import { useEffect, useState } from "react";
import { ClockIcon, DownloadIcon, CheckCircleIcon, CalendarIcon, AlertIcon } from "@/components/icons";
import { StatusBadge } from "@/components/ui-bits";
import { OFFICE_HOURS_LABEL } from "@/lib/office-hours";

type Record = {
  id: string;
  date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  ip_address: string | null;
  is_late?: boolean;
  is_early_leave?: boolean;
};

export default function AttendancePage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [today, setToday] = useState<Record | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  async function load() {
    setLoading(true);
    const [todayRes, historyRes] = await Promise.all([
      fetch("/api/attendance/today"),
      fetch("/api/attendance/history"),
    ]);
    if (todayRes.ok) {
      const d = await todayRes.json();
      setToday(d.attendance ?? null);
    }
    if (historyRes.ok) {
      const d = await historyRes.json();
      setRecords(Array.isArray(d) ? d : d.records ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function checkIn() {
    setCheckingIn(true);
    const res = await fetch("/api/attendance/checkin", { method: "POST" });
    if (res.ok) await load();
    setCheckingIn(false);
  }

  async function checkOut() {
    setCheckingOut(true);
    const res = await fetch("/api/attendance/checkout", { method: "POST" });
    if (res.ok) await load();
    setCheckingOut(false);
  }

  async function exportCSV() {
    const res = await fetch("/api/attendance/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function fmt(ts: string | null) {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
  }
  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric" });
  }

  return (
    <main className="dash-content fade-up">
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Track your daily check-ins and check-outs. Office hours: {OFFICE_HOURS_LABEL}.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={exportCSV}>
          <DownloadIcon size={14} />
          Export CSV
        </button>
      </div>

      {/* Today card */}
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CalendarIcon size={16} style={{ color: "var(--color-primary)" }} />
              Today
            </div>
            {today ? (
              <div style={{ marginTop: "0.45rem", display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
                <StatusBadge status={today.status} />
                <span className="text-sm text-muted">Check-in: {fmt(today.check_in)} · Check-out: {fmt(today.check_out)}</span>
              </div>
            ) : (
              <p className="text-sm text-muted" style={{ marginTop: "0.45rem" }}>No check-in recorded yet.</p>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.65rem" }}>
            {(!today || !today.check_in) && (
              <button className="btn btn-success" onClick={checkIn} disabled={checkingIn}>
                <ClockIcon size={14} />
                {checkingIn ? "…" : "Check In"}
              </button>
            )}
            {today?.check_in && !today.check_out && (
              <button className="btn btn-danger" onClick={checkOut} disabled={checkingOut}>
                <ClockIcon size={14} />
                {checkingOut ? "…" : "Check Out"}
              </button>
            )}
            {today?.check_in && today.check_out && (
              <span className="badge badge-success" style={{ padding: "0.4rem 0.75rem" }}>
                <CheckCircleIcon size={13} /> Day complete
              </span>
            )}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-title">Attendance history</div>
        <div className="card-subtitle">Your recent check-in/out log.</div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 44, borderRadius: "var(--radius-sm)" }} />)}
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ClockIcon size={22} /></div>
            <div className="empty-state-title">No attendance records yet</div>
            <p className="empty-state-sub">Check in today to start building your attendance history.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => {
                    let dur = "—";
                    if (r.check_in && r.check_out) {
                      const ms = new Date(r.check_out).getTime() - new Date(r.check_in).getTime();
                      const h = Math.floor(ms / 3600000);
                      const m = Math.floor((ms % 3600000) / 60000);
                      dur = `${h}h ${m}m`;
                    }
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 500 }}>{fmtDate(r.date)}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td className="text-muted">
                          {fmt(r.check_in)}
                          {r.is_late && (
                            <span className="badge badge-warning" style={{ marginLeft: "0.4rem", fontSize: "0.68rem" }}>
                              <AlertIcon size={11} /> Late
                            </span>
                          )}
                        </td>
                        <td className="text-muted">
                          {fmt(r.check_out)}
                          {r.is_early_leave && (
                            <span className="badge badge-warning" style={{ marginLeft: "0.4rem", fontSize: "0.68rem" }}>
                              <AlertIcon size={11} /> Early
                            </span>
                          )}
                        </td>
                        <td className="text-muted">{dur}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="list-cards">
              {records.map(r => {
                let dur = "—";
                if (r.check_in && r.check_out) {
                  const ms = new Date(r.check_out).getTime() - new Date(r.check_in).getTime();
                  const h = Math.floor(ms / 3600000);
                  const m = Math.floor((ms % 3600000) / 60000);
                  dur = `${h}h ${m}m`;
                }
                return (
                  <div key={r.id} className="list-card">
                    <div className="list-card-row">
                      <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{fmtDate(r.date)}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="list-card-row">
                      <span><span className="list-card-label">In </span>{fmt(r.check_in)}{r.is_late && " ⚠️"}</span>
                      <span><span className="list-card-label">Out </span>{fmt(r.check_out)}{r.is_early_leave && " ⚠️"}</span>
                      <span><span className="list-card-label">Duration </span>{dur}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
