// app/dashboard/analytics/page.tsx
"use client";
import { useEffect, useState } from "react";
import { TrendingUpIcon, BriefcaseIcon, PlaneIcon, BuildingIcon } from "@/components/icons";

type Data = {
  attendanceByDay: { date: string; present: number; late: number; absent: number; half_day: number }[];
  taskCounts: { todo: number; in_progress: number; blocked: number; done: number };
  leaveCounts: { pending: number; approved: number; rejected: number; cancelled: number };
  deptHeadcount: { name: string; count: number }[];
};

const TASK_COLORS: Record<string, string> = { todo: "var(--gray-400, #9ca3af)", in_progress: "#0891b2", blocked: "#dc2626", done: "#0d9488" };
const LEAVE_COLORS: Record<string, string> = { pending: "#d97706", approved: "#0d9488", rejected: "#dc2626", cancelled: "var(--gray-400, #9ca3af)" };

function Donut({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  const r = 42, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" width={140} height={140}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--gray-100, #f1f5f9)" strokeWidth="14" />
      {segments.map((s) => {
        const frac = s.value / total;
        const dash = frac * c;
        const el = (
          <circle
            key={s.label}
            cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="14"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 50 50)"
            strokeLinecap="butt"
          />
        );
        offset += dash;
        return el;
      })}
      <text x="50" y="54" textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--gray-800, #1e293b)">{total}</text>
    </svg>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics").then(r => r.ok ? r.json() : null).then(d => { if (d) setData(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <main className="dash-content fade-up">
        <div className="card"><div className="skeleton" style={{ height: 300 }} /></div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="dash-content fade-up">
        <div className="page-header"><h1 className="page-title">Analytics</h1></div>
        <div className="card"><p className="text-sm text-muted">You don't have access to analytics.</p></div>
      </main>
    );
  }

  const maxDay = Math.max(1, ...data.attendanceByDay.map(d => d.present + d.late + d.half_day + d.absent));
  const maxDept = Math.max(1, ...data.deptHeadcount.map(d => d.count));

  return (
    <main className="dash-content fade-up">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">A quick pulse on attendance, tasks, leave, and department size.</p>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <TrendingUpIcon size={16} style={{ color: "var(--color-primary)" }} />
          Attendance — last 7 days
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem", height: 160, marginTop: "1rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
          {data.attendanceByDay.map((d) => {
            const total = d.present + d.late + d.half_day + d.absent;
            return (
              <div key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", flexShrink: 0, minWidth: 34 }}>
                <div style={{ display: "flex", flexDirection: "column-reverse", height: 120, width: 26, borderRadius: 6, overflow: "hidden", background: "var(--gray-100, #f1f5f9)" }}>
                  <div style={{ height: `${(d.present / maxDay) * 120}px`, background: "#0d9488" }} title={`Present: ${d.present}`} />
                  <div style={{ height: `${(d.late / maxDay) * 120}px`, background: "#d97706" }} title={`Late: ${d.late}`} />
                  <div style={{ height: `${(d.half_day / maxDay) * 120}px`, background: "#0891b2" }} title={`Half day: ${d.half_day}`} />
                  <div style={{ height: `${(d.absent / maxDay) * 120}px`, background: "#dc2626" }} title={`Absent: ${d.absent}`} />
                </div>
                <span className="text-xs text-muted">{new Date(d.date).toLocaleDateString("en-PK", { weekday: "short" })}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.9rem" }}>
          {[["Present", "#0d9488"], ["Late", "#d97706"], ["Half day", "#0891b2"], ["Absent", "#dc2626"]].map(([label, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }} className="text-xs text-muted">
              <span style={{ width: 9, height: 9, borderRadius: 2, background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.1rem", marginBottom: "1.25rem" }} className="overview-grid">
        <div className="card">
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <BriefcaseIcon size={16} style={{ color: "var(--color-primary)" }} />
            Tasks by status
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            <Donut segments={Object.entries(data.taskCounts).map(([k, v]) => ({ label: k, value: v, color: TASK_COLORS[k] }))} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {Object.entries(data.taskCounts).map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }} className="text-sm">
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: TASK_COLORS[k] }} />
                  {k.replace("_", " ")}: <strong>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PlaneIcon size={16} style={{ color: "var(--color-primary)" }} />
            Leave by status
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            <Donut segments={Object.entries(data.leaveCounts).map(([k, v]) => ({ label: k, value: v, color: LEAVE_COLORS[k] }))} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {Object.entries(data.leaveCounts).map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }} className="text-sm">
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: LEAVE_COLORS[k] }} />
                  {k}: <strong>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <BuildingIcon size={16} style={{ color: "var(--color-primary)" }} />
          Headcount by department
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.75rem" }}>
          {data.deptHeadcount.map((d) => (
            <div key={d.name}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }} className="text-sm">
                <span>{d.name}</span>
                <strong>{d.count}</strong>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "var(--gray-100, #f1f5f9)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(d.count / maxDept) * 100}%`, background: "var(--color-primary)", borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
