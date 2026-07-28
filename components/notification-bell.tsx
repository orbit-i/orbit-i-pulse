// components/notification-bell.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon } from "@/components/icons";

type Notif = { id: string; title: string; body: string | null; type: string; link: string | null; is_read: boolean; created_at: string };

// A short two-tone chime, synthesized with the Web Audio API so no
// external audio file needs to be bundled or licensed. Distinct from
// the browser's default notification sound — this is ORBIT-I's own.
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [[880, 0], [1318.5, 0.12]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq as number;
      gain.gain.setValueAtTime(0, now + (delay as number));
      gain.gain.linearRampToValueAtTime(0.18, now + (delay as number) + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (delay as number) + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + (delay as number));
      osc.stop(now + (delay as number) + 0.4);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    // Web Audio unavailable — fail silently, never break the app for a sound effect.
  }
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell({ dark = false, align = "right" }: { dark?: boolean; align?: "left" | "right" }) {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const prevUnread = useRef<number | null>(null);
  const router = useRouter();

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const d = await res.json();
    setItems(d.notifications ?? []);
    const count = d.unreadCount ?? 0;
    if (prevUnread.current !== null && count > prevUnread.current) playChime();
    prevUnread.current = count;
    setUnread(count);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, []);

  async function markRead(n: Notif) {
    if (!n.is_read) {
      await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) });
      load();
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    load();
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Notifications"
        style={{
          position: "relative",
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: "none",
          background: dark ? "rgba(255,255,255,0.08)" : "var(--gray-100, #f1f5f9)",
          color: dark ? "#fff" : "var(--gray-600, #475569)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <BellIcon size={16} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, padding: "0 3px",
              borderRadius: 8, background: "var(--danger, #ef4444)", color: "#fff", fontSize: "0.6rem",
              fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div
            className="card"
            style={{
              position: "absolute",
              ...(align === "left" ? { left: 0 } : { right: 0 }),
              top: 42,
              width: 320,
              maxWidth: "calc(100vw - 2rem)",
              maxHeight: 420,
              overflowY: "auto",
              zIndex: 50,
              padding: "0.75rem",
              boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Notifications</span>
              {unread > 0 && <button className="btn btn-outline btn-sm" style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }} onClick={markAllRead}>Mark all read</button>}
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted" style={{ padding: "0.75rem 0" }}>You're all caught up.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {items.map(n => (
                  <button
                    key={n.id}
                    onClick={() => markRead(n)}
                    style={{
                      textAlign: "left", border: "none", background: n.is_read ? "transparent" : "color-mix(in srgb, var(--color-primary) 6%, transparent)",
                      borderRadius: "var(--radius-sm)", padding: "0.5rem 0.6rem", cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary)", flexShrink: 0 }} />}
                      <span style={{ fontWeight: 600, fontSize: "0.8rem" }}>{n.title}</span>
                    </div>
                    {n.body && <p className="text-xs text-muted" style={{ margin: "0.15rem 0 0 0.9rem" }}>{n.body}</p>}
                    <span className="text-xs text-muted" style={{ marginLeft: "0.9rem" }}>{timeAgo(n.created_at)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
