// app/dashboard/org-chart/page.tsx
"use client";
import { useEffect, useState } from "react";
import { NetworkIcon, SearchIcon } from "@/components/icons";
import { Avatar, RoleBadge } from "@/components/ui-bits";
import { ROLE_LEVEL, type Role } from "@/lib/roles";

type Node = {
  id: string;
  fullName: string;
  role: string;
  jobTitle: string | null;
  departmentName: string | null;
  avatarUrl?: string | null;
  reports: Node[];
};

function tierAccent(role: string) {
  const level = ROLE_LEVEL[role as Role] ?? 0;
  if (level >= 90) return "var(--color-primary)";        // admin/CEO/CTO
  if (level >= 60) return "var(--accent-cyan, #0891b2)";  // HR mgr / manager
  if (level >= 45) return "#d97706";                       // team lead / associate HR
  return "var(--gray-400, #9ca3af)";                       // members / interns
}

function PersonCard({ node }: { node: Node }) {
  const accent = tierAccent(node.role);
  return (
    <div
      className="card org-card"
      style={{
        padding: "0.75rem 1rem",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.65rem",
        minWidth: 210,
        maxWidth: 240,
        borderTop: `3px solid ${accent}`,
        textAlign: "left",
      }}
    >
      <Avatar name={node.fullName} size="sm" imageUrl={node.avatarUrl} />
      <div style={{ minWidth: 0 }}>
        <div className="org-card-name" style={{ fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {node.fullName}
        </div>
        <div className="text-xs text-muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {node.jobTitle || node.departmentName || "—"}
        </div>
        <div style={{ marginTop: "0.3rem" }}><RoleBadge role={node.role} /></div>
      </div>
    </div>
  );
}

// Renders one node as an <li>, recursing into a nested <ul> of its
// direct reports. This ul/li structure (styled in globals.css under
// .org-tree) is what draws the connecting lines between levels.
function TreeNode({ node }: { node: Node }) {
  return (
    <li>
      <PersonCard node={node} />
      {node.reports.length > 0 && (
        <ul>
          {node.reports.map(r => <TreeNode key={r.id} node={r} />)}
        </ul>
      )}
    </li>
  );
}

export default function OrgChartPage() {
  const [tree, setTree] = useState<Node[]>([]);
  const [people, setPeople] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"chart" | "directory">("chart");

  useEffect(() => {
    fetch("/api/org-chart").then(r => r.ok ? r.json() : null).then(d => {
      if (d) { setTree(d.tree ?? []); setPeople(d.people ?? []); }
      setLoading(false);
    });
  }, []);

  const filteredPeople = people.filter(p =>
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (p.jobTitle || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.departmentName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="dash-content fade-up">
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">Org chart &amp; directory</h1>
          <p className="page-subtitle">Everyone at ORBIT-I, and who reports to whom.</p>
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
              <p className="empty-state-sub">Once people are on the team, the reporting tree renders here automatically.</p>
            </div>
          </div>
        ) : (
          <div className="card org-tree-wrap">
            <ul className="org-tree">
              {tree.map(root => <TreeNode key={root.id} node={root} />)}
            </ul>
          </div>
        )
      ) : (
        <div className="card">
          <div style={{ position: "relative", marginBottom: "1rem", maxWidth: 320 }}>
            <span style={{ position: "absolute", left: "0.7rem", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", display: "flex" }}>
              <SearchIcon size={15} />
            </span>
            <input className="input" style={{ paddingLeft: "2.1rem" }} placeholder="Search people, title, department…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {filteredPeople.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><NetworkIcon size={22} /></div>
              <div className="empty-state-title">No matches</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
              {filteredPeople.map(p => <PersonCard key={p.id} node={{ ...p, reports: [] }} />)}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
