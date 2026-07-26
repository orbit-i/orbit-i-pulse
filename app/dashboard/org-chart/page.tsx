// app/dashboard/org-chart/page.tsx
"use client";
import { useEffect, useState } from "react";
import { NetworkIcon, SearchIcon, BuildingIcon, UsersIcon } from "@/components/icons";
import { Avatar, RoleBadge } from "@/components/ui-bits";
import { ROLE_LEVEL, type Role } from "@/lib/roles";

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
      style={{
        padding: "0.65rem 0.85rem",
        display: "flex",
        alignItems: "center",
        gap: "0.55rem",
        borderTop: `3px solid ${accent}`,
        textAlign: "left",
        width: "100%",
      }}
    >
      <Avatar name={node.fullName} size="sm" imageUrl={node.avatarUrl} />
      <div style={{ minWidth: 0 }}>
        <div className="org-card-name" style={{ fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {node.fullName}{node.isLead ? " ★" : ""}
        </div>
        <div className="text-xs text-muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {node.jobTitle || "—"}
        </div>
        <div style={{ marginTop: "0.25rem" }}><RoleBadge role={node.role} /></div>
      </div>
    </div>
  );
}

// A wrapped grid, never a forced single row — this is what stops a
// 14-person department from making the whole page 3500px wide.
function Roster({ people }: { people: Person[] }) {
  if (people.length === 0) return null;
  return (
    <div className="org-roster">
      {people.map((p) => <PersonCard key={p.id} node={p} />)}
    </div>
  );
}

function GroupHeader({ icon: Icon, name, sub, accent }: { icon: any; name: string; sub: string; accent: string }) {
  return (
    <div className="card org-card" style={{ padding: "0.7rem 1rem", display: "inline-flex", alignItems: "center", gap: "0.6rem", borderTop: `3px solid ${accent}` }}>
      <Icon size={16} style={{ color: accent }} />
      <div>
        <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{name}</div>
        <div className="text-xs text-muted">{sub}</div>
      </div>
    </div>
  );
}

function TeamBranch({ team }: { team: TeamNode }) {
  return (
    <li>
      <GroupHeader icon={UsersIcon} name={team.name} sub={`${team.members.length} ${team.members.length === 1 ? "member" : "members"}`} accent="#d97706" />
      <Roster people={team.members} />
    </li>
  );
}

function DepartmentBranch({ dept }: { dept: DeptNode }) {
  const sub = dept.headName ? `${dept.headcount} people · Head: ${dept.headName}` : `${dept.headcount} people`;
  const hasSubTree = dept.teams.length > 0;
  return (
    <li>
      <GroupHeader icon={BuildingIcon} name={dept.name} sub={sub} accent="var(--color-primary)" />
      {hasSubTree ? (
        <ul>
          {dept.teams.map((t) => <TeamBranch key={t.id} team={t} />)}
        </ul>
      ) : null}
      <Roster people={dept.directMembers} />
    </li>
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
  const [companyName, setCompanyName] = useState("ORBIT-I");
  const [tree, setTree] = useState<DeptNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"chart" | "directory">("chart");

  useEffect(() => {
    fetch("/api/org-chart").then(r => r.ok ? r.json() : null).then(d => {
      if (d) { setTree(d.tree ?? []); setCompanyName(d.companyName || "ORBIT-I"); }
      setLoading(false);
    });
  }, []);

  const allPeople = flattenPeople(tree);
  const filteredPeople = allPeople.filter(p =>
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (p.jobTitle || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="dash-content fade-up">
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">Org chart &amp; directory</h1>
          <p className="page-subtitle">Everyone at {companyName}, grouped by department and team.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className={`btn btn-sm ${view === "chart" ? "btn-primary" : "btn-outline"}`} onClick={() => setView("chart")}>Chart</button>
          <button className={`btn btn-sm ${view === "directory" ? "btn-primary" : "btn-outline"}`} onClick={() => setView("directory")}>Directory</button>
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
              <p className="empty-state-sub">Add departments and people to see the tree here.</p>
            </div>
          </div>
        ) : (
          <div className="card org-tree-wrap">
            <ul className="org-tree">
              <li>
                <GroupHeader icon={BuildingIcon} name={companyName} sub="Company" accent="var(--color-primary)" />
                <ul>
                  {tree.map((d) => <DepartmentBranch key={d.id} dept={d} />)}
                </ul>
              </li>
            </ul>
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
