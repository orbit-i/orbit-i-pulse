// app/dashboard/page.tsx — Overview / personal workspace home
"use client";
import { useEffect, useState } from "react";
import {
  ClockIcon, FileTextIcon, UsersIcon, TrendingUpIcon, CalendarIcon, CheckCircleIcon,
  BriefcaseIcon, PlaneIcon, BuildingIcon, MegaphoneIcon, NetworkIcon, UploadIcon, UserIcon,
} from "@/components/icons";
import { Avatar, StatusBadge, RoleBadge } from "@/components/ui-bits";
import { workspaceLane, canManageUsers } from "@/lib/permissions";

type Me = { fullName: string; role: string; userId: string; jobTitle?: string | null; departmentName?: string | null; avatarUrl?: string | null };
type Attendance = { status: string; check_in: string | null; check_out: string | null; id: string | null };
type Task = { id: string; title: string; status: string; priority: string; due_date: string | null };
type LeaveRequest = { id: string; status: string; leave_type: string; start_date: string; end_date: string; requester?: { full_name: string } };
type Department = { id: string; name: string; headcount: number };
type Announcement = { id: string; title: string; created_at: string };

export default function OverviewPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [teamCount, setTeamCount] = useState<number | null>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [givenTasks, setGivenTasks] = useState<Task[]>([]);
  const [myLeave, setMyLeave] = useState<LeaveRequest[]>([]);
  const [pendingLeave, setPendingLeave] = useState<LeaveRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(setMe);
    fetch("/api/attendance/today").then(r => r.json()).then(d => setAttendance(d.attendance ?? null));
    fetch("/api/tasks").then(r => r.ok ? r.json() : null).then(d => d && setMyTasks(d.tasks ?? []));
    fetch("/api/leave").then(r => r.ok ? r.json() : null).then(d => d && setMyLeave(d.leaveRequests ?? []));
    fetch("/api/announcements").then(r => r.ok ? r.json() : null).then(d => d && setAnnouncements((d.announcements ?? []).slice(0, 3)));
  }, []);

  useEffect(() => {
    if (!me) return;
    const lane = workspaceLane(me.role);
    if (canManageUsers(me.role) || lane === "leadership") {
      fetch("/api/users").then(r => r.ok ? r.json() : null).then(d => d && setTeamCount((d.users ?? []).length));
    }
    if (lane === "leadership" || lane === "hr" || lane === "executive") {
      fetch("/api/tasks?scope=given").then(r => r.ok ? r.json() : null).then(d => d && setGivenTasks(d.tasks ?? []));
      fetch("/api/leave?scope=team").then(r => r.ok ? r.json() : null).then(d => d && setPendingLeave((d.leaveRequests ?? []).filter((r: LeaveRequest) => r.status === "pending")));
    }
    if (lane === "hr" || lane === "executive") {
      fetch("/api/departments").then(r => r.ok ? r.json() : null).then(d => d && setDepartments(d.departments ?? []));
    }
  }, [me]);

  async function checkIn() {
    setCheckingIn(true);
    const res = await fetch("/api/attendance/checkin", { method: "POST" });
    if (res.ok) setAttendance((await res.json()).attendance);
    setCheckingIn(false);
  }

  async function checkOut() {
    setCheckingOut(true);
    const res = await fetch("/api/attendance/checkout", { method: "POST" });
    if (res.ok) setAttendance((await res.json()).attendance);
    setCheckingOut(false);
  }

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const today = now.toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const lane = me ? workspaceLane(me.role) : "individual";
  const openTasks = myTasks.filter(t => t.status !== "done").length;
  const pendingMyLeave = myLeave.filter(r => r.status === "pending").length;

  function fmt(ts: string | null) {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <main className="dash-content fade-up">
      {/* Greeting header */}
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.9rem", alignItems: "center" }}>
          {me && <Avatar name={me.fullName} imageUrl={me.avatarUrl} />}
          <div>
            <h1 className="page-title">{greeting}{me ? `, ${me.fullName.split(" ")[0]}` : ""} 👋</h1>
            <p className="page-subtitle">
              {today}
              {me?.jobTitle && <> · {me.jobTitle}</>}
              {me?.departmentName && <> · {me.departmentName}</>}
            </p>
          </div>
        </div>
        {me && <RoleBadge role={me.role} />}
      </div>

      {/* Stats row — composition depends on workspace lane */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon"><ClockIcon size={17} /></div>
          <div className="stat-card-value">{attendance ? fmt(attendance.check_in) : "—"}</div>
          <div className="stat-card-label">Today's check-in</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)" }}><CheckCircleIcon size={17} /></div>
          <div className="stat-card-value">{attendance ? fmt(attendance.check_out) : "—"}</div>
          <div className="stat-card-label">Today's check-out</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: "color-mix(in srgb, #f59e0b 12%, transparent)", color: "#d97706" }}><BriefcaseIcon size={17} /></div>
          <div className="stat-card-value">{openTasks}</div>
          <div className="stat-card-label">Open tasks</div>
        </div>
        {(lane === "leadership" || lane === "executive") && teamCount !== null ? (
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: "color-mix(in srgb, var(--accent-cyan) 12%, transparent)", color: "var(--success)" }}><UsersIcon size={17} /></div>
            <div className="stat-card-value">{teamCount}</div>
            <div className="stat-card-label">People visible to you</div>
          </div>
        ) : (
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: "color-mix(in srgb, var(--accent-cyan) 12%, transparent)", color: "var(--success)" }}><TrendingUpIcon size={17} /></div>
            <div className="stat-card-value">{attendance?.status ? attendance.status.replace("_", " ") : "—"}</div>
            <div className="stat-card-label">Today's status</div>
          </div>
        )}
      </div>

      {/* Attendance action card */}
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CalendarIcon size={16} style={{ color: "var(--color-primary)" }} />
              Today's Attendance
            </div>
            {attendance ? (
              <div style={{ marginTop: "0.4rem", display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
                <StatusBadge status={attendance.status} />
                <span className="text-sm text-muted">In: {fmt(attendance.check_in)} · Out: {fmt(attendance.check_out)}</span>
              </div>
            ) : (
              <p className="text-sm text-muted" style={{ marginTop: "0.4rem" }}>No attendance recorded yet today.</p>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            {(!attendance || !attendance.check_in) && (
              <button className="btn btn-success" onClick={checkIn} disabled={checkingIn}>
                <ClockIcon size={14} />
                {checkingIn ? "Checking in…" : "Check In"}
              </button>
            )}
            {attendance?.check_in && !attendance.check_out && (
              <button className="btn btn-danger" onClick={checkOut} disabled={checkingOut}>
                <ClockIcon size={14} />
                {checkingOut ? "Checking out…" : "Check Out"}
              </button>
            )}
            {attendance?.check_in && attendance.check_out && (
              <span className="badge badge-success"><CheckCircleIcon size={13} /> Day complete</span>
            )}
          </div>
        </div>
      </div>

      {/* Lane-specific widgets */}
      <div className="overview-grid" style={{ display: "grid", gridTemplateColumns: lane === "individual" ? "1fr" : "1.3fr 1fr", gap: "1.1rem", marginBottom: "1.25rem" }}>
        {/* My work — everyone */}
        <div className="card">
          <div className="card-title">My open tasks</div>
          <div className="card-subtitle">{pendingMyLeave > 0 ? `${pendingMyLeave} leave request(s) pending review` : "What's on your plate right now"}</div>
          {myTasks.filter(t => t.status !== "done").length === 0 ? (
            <p className="text-sm text-muted">No open tasks — nice and clear.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {myTasks.filter(t => t.status !== "done").slice(0, 4).map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                  <span className="text-sm" style={{ fontWeight: 600 }}>{t.title}</span>
                  <span className="badge badge-neutral"><span className="badge-dot" />{t.status.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: "1rem" }}>
            <a href="/dashboard/tasks" className="btn btn-outline btn-sm"><BriefcaseIcon size={14} />View all tasks</a>
          </div>
        </div>

        {/* Leadership / HR / Executive: approvals queue */}
        {(lane === "leadership" || lane === "hr" || lane === "executive") && (
          <div className="card">
            <div className="card-title">Pending leave approvals</div>
            <div className="card-subtitle">{pendingLeave.length} awaiting your review</div>
            {pendingLeave.length === 0 ? (
              <p className="text-sm text-muted">Nothing waiting on you right now.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {pendingLeave.slice(0, 4).map(r => (
                  <div key={r.id} className="text-sm">
                    <strong>{r.requester?.full_name || "Someone"}</strong> · {r.leave_type} · {new Date(r.start_date).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}–{new Date(r.end_date).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: "1rem" }}>
              <a href="/dashboard/leave" className="btn btn-outline btn-sm"><PlaneIcon size={14} />Review requests</a>
            </div>
          </div>
        )}
      </div>

      {/* HR / Executive: company snapshot */}
      {(lane === "hr" || lane === "executive") && departments.length > 0 && (
        <div className="card" style={{ marginBottom: "1.25rem" }}>
          <div className="card-title">Company snapshot</div>
          <div className="card-subtitle">Headcount by department</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
            {departments.map(d => (
              <div key={d.id} style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{d.headcount}</div>
                <div className="text-xs text-muted">{d.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Announcements preview */}
      {announcements.length > 0 && (
        <div className="card" style={{ marginBottom: "1.25rem" }}>
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MegaphoneIcon size={16} style={{ color: "var(--color-primary)" }} />
            Latest from the company
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {announcements.map(a => (
              <div key={a.id} className="text-sm" style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                <span style={{ fontWeight: 600 }}>{a.title}</span>
                <span className="text-xs text-muted">{new Date(a.created_at).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "0.85rem" }}>
            <a href="/dashboard/announcements" className="btn btn-outline btn-sm"><MegaphoneIcon size={14} />See all</a>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="card">
        <div className="card-title">Quick actions</div>
        <div className="card-subtitle">What do you need to do today?</div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a href="/dashboard/reports" className="btn btn-outline btn-sm">
            <FileTextIcon size={14} />
            Submit daily report
          </a>
          <a href="/dashboard/attendance" className="btn btn-outline btn-sm">
            <ClockIcon size={14} />
            View attendance log
          </a>
          <a href="/dashboard/leave" className="btn btn-outline btn-sm">
            <PlaneIcon size={14} />
            Request leave
          </a>
          <a href="/dashboard/org-chart" className="btn btn-outline btn-sm">
            <NetworkIcon size={14} />
            Org chart
          </a>
          <a href="/dashboard/documents" className="btn btn-outline btn-sm">
            <UploadIcon size={14} />
            Documents
          </a>
          <a href="/dashboard/profile" className="btn btn-outline btn-sm">
            <UserIcon size={14} />
            My profile
          </a>
          {me && canManageUsers(me.role) && (
            <a href="/dashboard/team" className="btn btn-outline btn-sm">
              <UsersIcon size={14} />
              Manage team
            </a>
          )}
          {me && (lane === "hr" || lane === "executive") && (
            <a href="/dashboard/departments" className="btn btn-outline btn-sm">
              <BuildingIcon size={14} />
              Departments
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
