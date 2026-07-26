// app/dashboard/org-chart/page.tsx
"use client";
import { useEffect, useState } from "react";
import { NetworkIcon, SearchIcon, BuildingIcon, UsersIcon } from "@/components/icons";
import { Avatar, RoleBadge } from "@/components/ui-bits";
import { ROLE_LEVEL, type Role } from "@/lib/roles";

type PersonNode = {
  type: "person";
  id: string;
  fullName: string;
  role: string;
  jobTitle: string | null;
  avatarUrl?: string | null;
  isLead?: boolean;
};
type GroupNode = {
  type: "department" | "team";
  id: string;
  name: string;
  headName?: string | null;
  headcount?: number;
  children: TreeNode[];
};
type TreeNode = PersonNode | GroupNode;

function tierAccent(role: string) {
  const level = ROLE_LEVEL[role as Role] ?? 0;
  if (level >= 90) return "var(--color-primary)";
  if (level >= 60) return "var(--accent-cyan, #0891b2)";
  if (level >= 45) return "#d97706";
  return "var(--gray-400, #9ca3af)";
}

function PersonCard({ node }: { node: PersonNode }) {
  const accent = tierAccent(node.role);
  return (
    <div
      className="card org-card"
      style={{
        padding: "0.75rem 1rem",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.65rem",
        minWidth: 200,
        maxWidth: 230,
        borderTop: `3px solid ${accent}`,
        textAlign: "left",
      }}
    >
      <Avatar name={node.fullName} size="sm" imageUrl={node.avatarUrl} />
      <div style={{ minWidth: 0 }}>
        <div className="org-card-name" style={{ fontWeight: 700, fontSize: "0.83rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {node.fullName}{node.isLead ? " ★" : ""}
        </div>
        <div className="text-xs text-muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {node.jobTitle || "—"}
        </div>
        <div style={{ marginTop: "0.3rem" }}><RoleBadge role={node.role} /></div>
      </div>
    </div>
  );
}

function GroupCard({ node }: { node: GroupNode }) {
  const isDept = node.type === "department";
  return (
    <div
      className="card org-card"
      style={{
        padding: "0.7rem 1rem",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.6rem",
        minWidth: 180,
        borderTop: `3px solid ${isDept ? "var(--color-primary)" : "#d97706"}`,
        background: isDept ? "color-mix(in srgb, var(--color-primary) 5%, var(--card-bg, #fff))" : undefined,
      }}
    >
      {isDept ? <BuildingIcon size={16} style={{ color: "var(--color-primary)" }} /> : <UsersIcon size={16} style={{ color: "#d97706" }} />}
      <div>
        <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{node.name}</div>
        <div className="text-xs text-muted">
          {node.headcount ?? node.children.length} {(node.headcount ?? node.children.length) === 1 ? "person" : "people"}
        </div>
      </div>
    </div>
  );
}

function TreeBranch({ node }: { node: TreeNode }) {
  if (node.type === "person") {
    return (
      <li>
        <PersonCard node={node} />
      </li>
    );
  }
  return (
    <li>
      <GroupCard node={node} />
      {node.children.length > 0 && (
        <ul>
          {node.children.map((c) => <TreeBranch key={`${c.type}-${c.id}`} node={c} />)}
        </ul>
      )}
    </li>
  );
}

function flattenPeople(nodes: TreeNode[]): PersonNode[] {
  const out: PersonNode[] = [];
  for (const n of nodes) {
    if (n.type === "person") out.push(n);
    else out.push(...flattenPeople(n.children));
  }
  return out;
}

export default function OrgChartPage() {
  const [companyName, setCompanyName] = useState("ORBIT-I");
  const [tree, setTree] = useState<TreeNode[]>([]);
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
                <div className="card org-card" style={{ padding: "0.85rem 1.2rem", display: "inline-flex", alignItems: "center", gap: "0.6rem", borderTop: "3px solid var(--color-primary)", fontWeight: 700 }}>
                  <BuildingIcon size={18} style={{ color: "var(--color-primary)" }} />
                  {companyName}
                </div>
                <ul>
                  {tree.map((n) => <TreeBranch key={`${n.type}-${n.id}`} node={n} />)}
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
              {filteredPeople.map(p => <PersonCard key={p.id} node={p} />)}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
