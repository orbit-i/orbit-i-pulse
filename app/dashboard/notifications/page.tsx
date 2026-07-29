// app/dashboard/notifications/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon, CheckCircleIcon } from "@/components/icons";
import { useToast } from "@/components/toast";

type Notif = { id: string; title: string; body: string | null; type: string; link: string | null; is_read: boolean; created_at: string };

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();

  async function load() {
    setLoading(true);
    const res = await fetch("/api/notifications");
    if (res.ok) setItems((await res.json()).notifications ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function openNotif(n: Notif) {
    if (!n.is_read) {
      await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) });
      load();
    }
    if (n.link) router.push(n.link);
  }

  async function markAllRead() {
    const res = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    if (res.ok) { toast.push("All caught up.", "success"); load(); }
  }

  const unreadCount = items.filter(n => !n.is_read).length;

  return (
    <main className="dash-content fade-up">
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-outline btn-sm" onClick={markAllRead}>
            <CheckCircleIcon size={14} />
            Mark all read
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 56 }} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><BellIcon size={22} /></div>
            <div className="empty-state-title">No notifications yet</div>
            <p className="empty-state-sub">Task assignments, leave decisions, and announcements will show up here.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {items.map(n => (
              <button
                key={n.id}
                onClick={() => openNotif(n)}
                style={{
                  textAlign: "left",
                  border: "1px solid var(--border)",
                  background: n.is_read ? "transparent" : "color-mix(in srgb, var(--color-primary) 6%, transparent)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.75rem 0.9rem",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <div className="list-card-row" style={{ marginTop: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                    {!n.is_read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-primary)", flexShrink: 0 }} />}
                    <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{n.title}</span>
                  </div>
                  <span className="text-xs text-muted" style={{ flexShrink: 0 }}>{timeAgo(n.created_at)}</span>
                </div>
                {n.body && <p className="text-sm text-muted" style={{ marginTop: "0.3rem", marginLeft: n.is_read ? 0 : "0.95rem" }}>{n.body}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
