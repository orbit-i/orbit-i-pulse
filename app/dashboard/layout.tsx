// app/dashboard/layout.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { appConfig } from "@/config";
import { HomeIcon, ClockIcon, FileTextIcon, UsersIcon, LogOutIcon, MenuIcon, XIcon, SparkIcon, BriefcaseIcon, PlaneIcon, NetworkIcon, BuildingIcon, MegaphoneIcon, UploadIcon, UserIcon } from "@/components/icons";
import { Avatar } from "@/components/ui-bits";
import { useToast } from "@/components/toast";
import { canManageUsers, canManageDepartments } from "@/lib/permissions";

type User = { fullName: string; role: string; email: string; avatarUrl?: string | null };

const NAV = [
  { href: "/dashboard", label: "Overview", icon: HomeIcon },
  { href: "/dashboard/attendance", label: "Attendance", icon: ClockIcon },
  { href: "/dashboard/reports", label: "Daily Reports", icon: FileTextIcon },
  { href: "/dashboard/tasks", label: "Tasks", icon: BriefcaseIcon },
  { href: "/dashboard/leave", label: "Leave", icon: PlaneIcon },
  { href: "/dashboard/documents", label: "Documents", icon: UploadIcon },
  { href: "/dashboard/org-chart", label: "Org Chart", icon: NetworkIcon },
  { href: "/dashboard/team", label: "Team", icon: UsersIcon, gate: "team" as const },
  { href: "/dashboard/departments", label: "Departments", icon: BuildingIcon, gate: "departments" as const },
  { href: "/dashboard/announcements", label: "Announcements", icon: MegaphoneIcon },
  { href: "/dashboard/profile", label: "My Profile", icon: UserIcon },
];

// Extracted as a standalone component (not a nested function) to avoid
// React re-mounting it on every render — which caused the double-sidebar flicker.
function SidebarContent({
  user,
  pathname,
  onLogout,
}: {
  user: User | null;
  pathname: string;
  onLogout: () => void;
}) {
  const role = user?.role || "";
  const gates: Record<string, boolean> = {
    team: canManageUsers(role),
    departments: canManageDepartments(role),
  };
  return (
    <>
      <div className="sidebar-brand">
        <div className="brand-lockup">
          <div className="brand-tile" style={{ width: 34, height: 34 }}>
            <img src={appConfig.logoUrl} alt={appConfig.companyName} width={34} height={34} />
          </div>
          <span className="brand-name" style={{ fontSize: "0.97rem", color: "#fff" }}>
            {appConfig.companyName}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <span className="nav-section-label">Workspace</span>
        {NAV.filter(n => !("gate" in n) || gates[(n as any).gate]).map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            <Avatar name={user.fullName} size="sm" imageUrl={user.avatarUrl} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="sidebar-user-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.fullName}
              </div>
              <div className="sidebar-user-role">{user.role}</div>
            </div>
          </div>
        )}
        <button onClick={onLogout} className="nav-link" style={{ color: "rgba(255,255,255,0.55)" }}>
          <LogOutIcon size={15} />
          Sign out
        </button>
        <div className="sidebar-credit" style={{ marginTop: "0.75rem" }}>
          {appConfig.creditLabel}
        </div>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!d) { router.push("/login"); } else setUser(d); })
      .catch(() => router.push("/login"));
  }, [router]);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Close drawer on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setDrawerOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.push("Signed out.", "info");
    router.push("/login");
    router.refresh();
  }

  const sidebarProps = { user, pathname, onLogout: handleLogout };

  return (
    <div className="dash-shell">
      {/* Desktop sidebar — hidden via CSS on mobile */}
      <aside className="dash-sidebar" aria-label="Sidebar">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile: overlay + drawer */}
      <div
        className={`drawer-overlay ${drawerOpen ? "open" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef as React.RefObject<HTMLElement>}
        id="mobile-sidebar"
        className={`dash-sidebar drawer ${drawerOpen ? "open" : ""}`}
        aria-label="Mobile navigation"
        aria-hidden={!drawerOpen}
      >
        <SidebarContent {...sidebarProps} />
      </aside>

      <div className="dash-main">
        {/* Mobile topbar */}
        <header className="dash-topbar" role="banner">
          <button
            className="topbar-toggle"
            onClick={() => setDrawerOpen(v => !v)}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            aria-controls="mobile-sidebar"
          >
            {drawerOpen ? <XIcon size={18} /> : <MenuIcon size={18} />}
          </button>
          <div className="brand-lockup">
            <div className="brand-tile" style={{ width: 28, height: 28 }}>
              <img src={appConfig.logoUrl} alt="" width={28} height={28} />
            </div>
            <span className="brand-name" style={{ fontSize: "0.92rem", color: "#fff" }}>
              {appConfig.companyName}
            </span>
          </div>
          {user && <Avatar name={user.fullName} size="sm" imageUrl={user.avatarUrl} />}
        </header>

        {!user ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem", color: "var(--gray-400)" }}>
              <SparkIcon size={28} />
              <span className="text-sm">Loading workspace…</span>
            </div>
          </div>
        ) : (
          children
        )}

        <footer className="dash-footer">
          {appConfig.creditLabel} · {appConfig.companyName} Pulse
        </footer>
      </div>
    </div>
  );
}
