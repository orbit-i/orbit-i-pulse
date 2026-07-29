// components/notification-bell.tsx
// Deliberately NOT a dropdown panel — dropdowns rendered inside the
// sidebar get clipped by the sidebar's own overflow/scroll box no
// matter how they're positioned (a classic CSS gotcha: overflow on
// any ancestor clips absolutely-positioned descendants too). Instead,
// the bell is a direct link to a full Notifications page — simpler,
// never clips, and works identically on desktop and mobile.
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon } from "@/components/icons";

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

export function NotificationBell({ dark = false }: { dark?: boolean; align?: "left" | "right" }) {
  const [unread, setUnread] = useState(0);
  const prevUnread = useRef<number | null>(null);
  const router = useRouter();

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const d = await res.json();
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

  return (
    <button
      onClick={() => router.push("/dashboard/notifications")}
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
        flexShrink: 0,
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
  );
}
