// app/dashboard/chat/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { UsersIcon, BuildingIcon, SendIcon } from "@/components/icons";
import { Avatar } from "@/components/ui-bits";

type Channel = { scope: "department" | "team"; id: string; name: string; sub?: string };
type Msg = { id: string; body: string; created_at: string; sender_id: string; sender?: { full_name: string; role: string; avatar_url: string | null } };
type Me = { userId: string; role: string };

const ELEVATED = ["admin", "founder", "co_founder", "ceo", "cto", "coo", "hr_manager", "associate_hr"];

export default function ChatPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [active, setActive] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me");
      const meData = meRes.ok ? await meRes.json() : null;
      setMe(meData);

      const [deptRes, teamRes, profRes] = await Promise.all([
        fetch("/api/departments"), fetch("/api/teams"), fetch("/api/profile"),
      ]);
      const depts = deptRes.ok ? (await deptRes.json()).departments ?? [] : [];
      const teams = teamRes.ok ? (await teamRes.json()).teams ?? [] : [];
      const profile = profRes.ok ? (await profRes.json()).profile : null;

      const isElevated = meData && ELEVATED.includes(meData.role);
      const visibleDepts = isElevated ? depts : depts.filter((d: any) => d.id === profile?.department_id);
      const visibleTeams = isElevated ? teams : teams.filter((t: any) => t.id === profile?.team_id);

      const chans: Channel[] = [
        ...visibleDepts.map((d: any) => ({ scope: "department" as const, id: d.id, name: d.name, sub: `${d.headcount ?? 0} people` })),
        ...visibleTeams.map((t: any) => ({ scope: "team" as const, id: t.id, name: t.name, sub: t.departmentName || "Team" })),
      ];
      setChannels(chans);
      if (chans.length > 0) setActive(chans[0]);
      setLoading(false);
    })();
  }, []);

  async function loadMessages(ch: Channel) {
    const res = await fetch(`/api/messages?scope=${ch.scope}&id=${ch.id}`);
    if (res.ok) setMessages((await res.json()).messages ?? []);
  }

  useEffect(() => {
    if (!active) return;
    loadMessages(active);
    const id = setInterval(() => loadMessages(active), 5000);
    return () => clearInterval(id);
  }, [active?.scope, active?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function send() {
    if (!text.trim() || !active) return;
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: active.scope, id: active.id, body: text }),
    });
    setSending(false);
    if (res.ok) { setText(""); loadMessages(active); }
  }

  return (
    <main className="dash-content fade-up">
      <div className="page-header">
        <h1 className="page-title">Discussions</h1>
        <p className="page-subtitle">Chat with your department and team — like a group chat, scoped to who actually works together.</p>
      </div>

      {loading ? (
        <div className="card"><div className="skeleton" style={{ height: 300 }} /></div>
      ) : channels.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><UsersIcon size={22} /></div>
            <div className="empty-state-title">No channel yet</div>
            <p className="empty-state-sub">You'll get a channel once an admin assigns you to a department or team.</p>
          </div>
        </div>
      ) : (
        <div className="card chat-shell">
          <div className="chat-channel-list">
            {channels.map((c) => (
              <button
                key={`${c.scope}-${c.id}`}
                className={`chat-channel-btn ${active?.id === c.id && active?.scope === c.scope ? "active" : ""}`}
                onClick={() => setActive(c)}
              >
                {c.scope === "department" ? <BuildingIcon size={15} /> : <UsersIcon size={15} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  <div className="text-xs text-muted">{c.sub}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="chat-thread">
            <div className="chat-messages">
              {messages.length === 0 ? (
                <p className="text-sm text-muted" style={{ textAlign: "center", marginTop: "2rem" }}>No messages yet — say hello 👋</p>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_id === me?.userId;
                  return (
                    <div key={m.id} className={`chat-bubble-row ${mine ? "mine" : ""}`}>
                      {!mine && <Avatar name={m.sender?.full_name || "?"} size="sm" imageUrl={m.sender?.avatar_url} />}
                      <div className={`chat-bubble ${mine ? "mine" : ""}`}>
                        {!mine && <div className="chat-bubble-sender">{m.sender?.full_name}</div>}
                        <div>{m.body}</div>
                        <div className="chat-bubble-time">{new Date(m.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
            <div className="chat-input-row">
              <input
                className="input"
                placeholder={`Message ${active?.name || ""}…`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <button className="btn btn-primary btn-sm" onClick={send} disabled={sending || !text.trim()}>
                <SendIcon size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
