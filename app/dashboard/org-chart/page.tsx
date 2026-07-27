// app/dashboard/org-chart/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { NetworkIcon, SearchIcon, BuildingIcon, UsersIcon, DownloadIcon } from "@/components/icons";
import { Avatar, RoleBadge } from "@/components/ui-bits";
import { ROLE_LEVEL, type Role } from "@/lib/roles";
import { useToast } from "@/components/toast";

type Person = {
  type: "person";
  id: string;
  fullName: string;
  role: string;
  jobTitle: string | null;
  avatarUrl?: string | null;
  isLead?: boolean;
};
type TeamNode = { type: "team"; id: string; name: string; members: Person[] };
type DeptNode = {
  type: "department";
  id: string;
  name: string;
  headName: string | null;
  headcount: number;
  teams: TeamNode[];
  directMembers: Person[];
};
type Me = { role: string };

const CAN_DOWNLOAD = ["admin", "founder", "co_founder", "ceo", "cto", "coo"];

function tierAccent(role: string) {
  const level = ROLE_LEVEL[role as Role] ?? 0;
  if (level >= 90) return "var(--color-primary)";
  if (level >= 60) return "var(--accent-cyan, #0891b2)";
  if (level >= 45) return "#d97706";
  return "var(--gray-400, #9ca3af)";
}

function PersonCard({ node }: { node: Person }) {
  const accent = tierAccent(node.role);
  return (
    <div
      className="card org-card"
      style={{ padding: "0.6rem 0.8rem", display: "flex", alignItems: "center", gap: "0.5rem", borderTop: `3px solid ${accent}`, textAlign: "left" }}
    >
      <Avatar name={node.fullName} size="sm" imageUrl={node.avatarUrl} />
      <div style={{ minWidth: 0 }}>
        <div className="org-card-name" style={{ fontWeight: 700, fontSize: "0.79rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {node.fullName}{node.isLead ? " ★" : ""}
        </div>
        <div className="text-xs text-muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {node.jobTitle || "—"}
        </div>
        <div style={{ marginTop: "0.2rem" }}><RoleBadge role={node.role} /></div>
      </div>
    </div>
  );
}

function Roster({ people }: { people: Person[] }) {
  if (people.length === 0) return null;
  return <div className="org-roster">{people.map((p) => <PersonCard key={p.id} node={p} />)}</div>;
}

function DepartmentCard({ dept }: { dept: DeptNode }) {
  return (
    <div className="card org-dept-card">
      <div className="org-dept-card-header">
        <BuildingIcon size={17} style={{ color: "var(--color-primary)" }} />
        <div>
          <div className="org-dept-card-title">{dept.name}</div>
          <div className="text-xs text-muted">
            {dept.headcount} {dept.headcount === 1 ? "person" : "people"}
            {dept.headName ? ` · Head: ${dept.headName}` : ""}
          </div>
        </div>
      </div>

      <Roster people={dept.directMembers} />

      {dept.teams.map((team) => (
        <div className="org-team-block" key={team.id}>
          <div className="org-team-block-header">
            <UsersIcon size={13} />
            {team.name} · {team.members.length} {team.members.length === 1 ? "member" : "members"}
          </div>
          <Roster people={team.members} />
        </div>
      ))}

      {dept.directMembers.length === 0 && dept.teams.length === 0 && (
        <p className="text-xs text-muted" style={{ marginTop: "0.5rem" }}>No one here yet.</p>
      )}
    </div>
  );
}

function flattenPeople(tree: DeptNode[]): Person[] {
  const out: Person[] = [];
  for (const d of tree) {
    out.push(...d.directMembers);
    for (const t of d.teams) out.push(...t.members);
  }
  return out;
}

export default function OrgChartPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [companyName, setCompanyName] = useState("ORBIT-I");
  const [leadership, setLeadership] = useState<Person[]>([]);
  const [tree, setTree] = useState<DeptNode[]>([]);
  const [totalPeople, setTotalPeople] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"chart" | "directory">("chart");
  const [downloading, setDownloading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => d && setMe(d));
    fetch("/api/org-chart").then(r => r.ok ? r.json() : null).then(d => {
      if (d) { setTree(d.tree ?? []); setCompanyName(d.companyName || "ORBIT-I"); setTotalPeople(d.totalPeople ?? 0); setLeadership(d.leadership ?? []); }
      setLoading(false);
    });
  }, []);

  const allPeople = [...leadership, ...flattenPeople(tree)];
  const filteredPeople = allPeople.filter(p =>
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (p.jobTitle || "").toLowerCase().includes(search.toLowerCase())
  );

  const canDownload = !!me && CAN_DOWNLOAD.includes(me.role);

  async function downloadChart() {
    if (!chartRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(chartRef.current, { backgroundColor: "#f8fafc", pixelRatio: 2, cacheBust: true });
      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      link.download = `${companyName.replace(/\s+/g, "-").toLowerCase()}-org-chart-${stamp}.png`;
      link.href = dataUrl;
      link.click();
      toast.push("Org chart downloaded.", "success");
    } catch (e: any) {
      toast.push("Couldn't generate the image. Try again.", "error");
    }
    setDownloading(false);
  }

  return (
    <main className="dash-content fade-up">
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">Org chart &amp; directory</h1>
          <p className="page-subtitle">Everyone at {companyName}, grouped by department and team.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className={`btn btn-sm ${view === "chart" ? "btn-primary" : "btn-outline"}`} onClick={() => setView("chart")}>Chart</button>
          <button className={`btn btn-sm ${view === "directory" ? "btn-primary" : "btn-outline"}`} onClick={() => setView("directory")}>Directory</button>
          {canDownload && view === "chart" && (
            <button className="btn btn-outline btn-sm" onClick={downloadChart} disabled={downloading || loading || tree.length === 0}>
              <DownloadIcon size={14} />
              {downloading ? "Generating…" : "Download as image"}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="skeleton" style={{ height: 200 }} /></div>
      ) : view === "chart" ? (
        tree.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><NetworkIcon size={22} /></div>
              <div className="empty-state-title">No one to show yet</div>
              <p className="empty-state-sub">Add departments and people to see the chart here.</p>
            </div>
          </div>
        ) : (
          <div ref={chartRef} style={{ background: "#f8fafc", padding: "1rem", borderRadius: "var(--radius-md)" }}>
            <div className="org-company-banner">
              <BuildingIcon size={22} />
              <div>
                <div className="org-company-name">{companyName}</div>
                <div className="org-company-sub">{totalPeople} {totalPeople === 1 ? "person" : "people"} across {tree.length} {tree.length === 1 ? "department" : "departments"}</div>
              </div>
            </div>
            {leadership.length > 0 && (
              <div className="card org-dept-card" style={{ marginBottom: "1rem" }}>
                <div className="org-dept-card-header">
                  <NetworkIcon size={17} style={{ color: "var(--color-primary)" }} />
                  <div>
                    <div className="org-dept-card-title">Leadership</div>
                    <div className="text-xs text-muted">Oversees the whole company — not tied to one department</div>
                  </div>
                </div>
                <Roster people={leadership} />
              </div>
            )}
            <div className="org-dept-grid">
              {tree.map((dept) => <DepartmentCard key={dept.id} dept={dept} />)}
            </div>
          </div>
        )
      ) : (
        <div className="card">
          <div style={{ position: "relative", marginBottom: "1rem", maxWidth: 320 }}>
            <span style={{ position: "absolute", left: "0.7rem", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", display: "flex" }}>
              <SearchIcon size={15} />
            </span>
            <input className="input" style={{ paddingLeft: "2.1rem" }} placeholder="Search people or title…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {filteredPeople.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><NetworkIcon size={22} /></div>
              <div className="empty-state-title">No matches</div>
            </div>
          ) : (
            <div className="org-roster">
              {filteredPeople.map(p => <PersonCard key={p.id} node={p} />)}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
