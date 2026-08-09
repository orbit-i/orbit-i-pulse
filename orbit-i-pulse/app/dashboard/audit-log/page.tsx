// app/dashboard/audit-log/page.tsx
"use client";
import { useEffect, useState } from "react";
import { ShieldIcon } from "@/components/icons";

type Log = { id: string; action: string; target_type: string | null; target_id: string | null; meta: any; created_at: string; actor?: { full_name: string; role: string } };

const ACTION_LABELS: Record<string, string> = {
  role_changed: "changed a role to",
  user_deactivated: "deactivated a user",
  user_deleted: "permanently deleted a user",
  department_deleted: "deleted a department",
  team_deleted: "deleted a team",
  settings_updated: "updated company settings",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit-log").then(r => r.ok ? r.json() : null).then(d => { if (d) setLogs(d.logs ?? []); setLoading(false); });
  }, []);

  return (
    <main className="dash-content fade-up">
      <div className="page-header">
        <h1 className="page-title">Audit log</h1>
        <p className="page-subtitle">Who changed what — role changes, deletions, department/team structure, and settings.</p>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 50 }} />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ShieldIcon size={22} /></div>
            <div className="empty-state-title">No activity recorded yet</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {logs.map((l) => (
              <div key={l.id} className="list-card-row" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
                <div style={{ minWidth: 0 }}>
                  <span className="text-sm">
                    <strong>{l.actor?.full_name || "Someone"}</strong> {ACTION_LABELS[l.action] || l.action}
                    {l.meta?.newRole && <> <strong>{l.meta.newRole}</strong></>}
                    {l.meta?.name && <> — {l.meta.name}</>}
                  </span>
                </div>
                <span className="text-xs text-muted" style={{ flexShrink: 0 }}>{new Date(l.created_at).toLocaleString("en-PK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
