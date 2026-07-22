// app/dashboard/team/page.tsx
"use client";
import { useEffect, useState } from "react";
import { UsersIcon, SearchIcon, ShieldIcon, UserIcon, SparkIcon, ChevronDownIcon } from "@/components/icons";
import { Avatar, RoleBadge, ErrorBanner } from "@/components/ui-bits";
import { useToast } from "@/components/toast";
import { ALL_ROLES, PRIMARY_ROLES, SECONDARY_ROLES, ROLE_LABELS, type Role } from "@/lib/roles";
import { canChangeRoles } from "@/lib/permissions";

type Member = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  manager_id: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  job_title?: string | null;
  departments?: { name: string } | null;
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [me, setMe] = useState<{ role: string } | null>(null);
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [meRes, usersRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/users"),
      ]);
      if (meRes.ok) setMe(await meRes.json());
      if (usersRes.ok) {
        const d = await usersRes.json();
        setMembers(Array.isArray(d) ? d : d.users ?? []);
      } else {
        const d = await usersRes.json().catch(() => ({}));
        setError(d.error || `Couldn't load the team (server returned ${usersRes.status}).`);
      }
    } catch (e: any) {
      setError(e.message || "Network error while loading the team.");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function changeRole(userId: string, role: string) {
    setUpdatingId(userId);
    const res = await fetch(`/api/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      toast.push(`Role updated to ${ROLE_LABELS[role as Role] || role}`, "success");
      await load();
    } else {
      const d = await res.json();
      toast.push(d.error || "Failed to update role.", "error");
    }
    setUpdatingId(null);
  }

  const filtered = members.filter(m => {
    const matchesSearch =
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      (ROLE_LABELS[m.role as Role] || m.role).toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const isAdmin = !!me && canChangeRoles(me.role);
  const dropdownRoles = showAllRoles ? ALL_ROLES : (PRIMARY_ROLES as readonly Role[]);

  function fmtDate(d: string) {
    if (!d) return "—";
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <main className="dash-content fade-up">
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">Team</h1>
          <p className="page-subtitle">Manage members, interns, and roles — grouped by category for easy review.</p>
        </div>
        <div style={{ display: "flex", gap: "0.65rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "0.7rem", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", display: "flex" }}>
              <SearchIcon size={15} />
            </span>
            <input
              type="search"
              className="input"
              style={{ paddingLeft: "2.1rem", width: 220 }}
              placeholder="Search name, email, phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select"
            style={{ width: "auto", minWidth: 150 }}
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {ALL_ROLES.map(r => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Stat row — one card per role category, so admin sees team breakdown at a glance */}
      <div className="stat-grid" style={{ marginBottom: "1.25rem" }}>
        {ALL_ROLES.map(role => (
          <div
            key={role}
            className="stat-card"
            style={{ cursor: "pointer", outline: roleFilter === role ? "2px solid var(--color-primary)" : "none" }}
            onClick={() => setRoleFilter(prev => (prev === role ? "all" : role))}
          >
            <div className="stat-card-icon">
              {role === "admin" ? <ShieldIcon size={16} /> : role === "manager" ? <SparkIcon size={16} /> : <UserIcon size={16} />}
            </div>
            <div className="stat-card-value">
              {members.filter(m => m.role === role).length}
            </div>
            <div className="stat-card-label">{ROLE_LABELS[role]}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <div className="card-title">All members <span style={{ fontWeight: 400, color: "var(--gray-400)", fontSize: "0.85rem" }}>({filtered.length})</span></div>
            <div className="card-subtitle">
              {isAdmin ? "Change a member's role via the dropdown in the Role column." : "View your team roster."}
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowAllRoles(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
            >
              <ChevronDownIcon size={13} style={{ transform: showAllRoles ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
              {showAllRoles ? "Hide extra roles" : "Show all roles"}
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 52 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><UsersIcon size={22} /></div>
            <div className="empty-state-title">{search || roleFilter !== "all" ? "No members match your filters" : "No team members yet"}</div>
            <p className="empty-state-sub">Members appear here when they register for an account.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Department</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                          <Avatar name={m.full_name} size="sm" imageUrl={m.avatar_url} />
                          <span style={{ fontWeight: 600 }}>{m.full_name}</span>
                        </div>
                      </td>
                      <td className="text-muted">
                        {m.departments?.name || "—"}
                        {m.job_title && <div className="text-xs text-muted">{m.job_title}</div>}
                      </td>
                      <td className="text-muted">
                        {m.phone || "—"}
                      </td>
                      <td className="text-muted">{m.email}</td>
                      <td>
                        {isAdmin ? (
                          <select
                            className="select"
                            style={{ width: "auto", minWidth: 150, padding: "0.3rem 0.55rem", fontSize: "0.8rem" }}
                            value={m.role}
                            disabled={updatingId === m.id}
                            onChange={e => changeRole(m.id, e.target.value)}
                          >
                            {/* Always include the member's current role even if it's
                                a "hidden" secondary role, so the select never shows
                                a blank/mismatched value. */}
                            {!dropdownRoles.includes(m.role as Role) && (
                              <option value={m.role}>{ROLE_LABELS[m.role as Role] || m.role}</option>
                            )}
                            {dropdownRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>
                        ) : (
                          <RoleBadge role={m.role} />
                        )}
                      </td>
                      <td className="text-muted">{fmtDate(m.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="list-cards">
              {filtered.map(m => (
                <div key={m.id} className="list-card">
                  <div className="list-card-row">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <Avatar name={m.full_name} size="sm" imageUrl={m.avatar_url} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{m.full_name}</div>
                        <div className="text-xs text-muted">{m.email}</div>
                        {m.departments?.name && <div className="text-xs text-muted">{m.departments.name}{m.job_title ? ` · ${m.job_title}` : ""}</div>}
                        {m.phone && (
                          <div className="text-xs text-muted">{m.phone}</div>
                        )}
                      </div>
                    </div>
                    <RoleBadge role={m.role} />
                  </div>
                  {isAdmin && (
                    <div style={{ marginTop: "0.6rem" }}>
                      <select
                        className="select"
                        style={{ fontSize: "0.82rem", padding: "0.35rem 0.6rem" }}
                        value={m.role}
                        disabled={updatingId === m.id}
                        onChange={e => changeRole(m.id, e.target.value)}
                      >
                        {!dropdownRoles.includes(m.role as Role) && (
                          <option value={m.role}>{ROLE_LABELS[m.role as Role] || m.role}</option>
                        )}
                        {dropdownRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="list-card-row" style={{ marginTop: "0.4rem" }}>
                    <span className="text-xs text-muted">Joined {fmtDate(m.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
