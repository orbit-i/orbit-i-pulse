// app/dashboard/org-chart/page.tsx
"use client";
import { useEffect, useState } from "react";
import { NetworkIcon, SearchIcon } from "@/components/icons";
import { Avatar, RoleBadge } from "@/components/ui-bits";

type Node = {
  id: string;
  fullName: string;
  role: string;
  jobTitle: string | null;
  departmentName: string | null;
  reports: Node[];
};

function PersonCard({ node }: { node: Node }) {
  return (
    <div className="card" style={{ padding: "0.85rem 1rem", display: "inline-flex", alignItems: "center", gap: "0.65rem", minWidth: 220 }}>
      <Avatar name={node.fullName} size="sm" />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "0.87rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.fullName}</div>
        <div className="text-xs text-muted">{node.jobTitle || node.departmentName || "—"}</div>
        <div style={{ marginTop: "0.3rem" }}><RoleBadge role={node.role} /></div>
      </div>
    </div>
  );
}

function Branch({ node, depth }: { node: Node; depth: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <PersonCard node={node} />
      {node.reports.length > 0 && (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", paddingLeft: depth < 1 ? 0 : "1.5rem", borderLeft: depth < 1 ? "none" : "2px dashed var(--border)" }}>
          {node.reports.map(r => <Branch key={r.id} node={r} depth={depth + 1} />)}
        </div>
      )}
    </div>
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
        <div className="card" style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", paddingBottom: "0.5rem" }}>
            {tree.map(root => <Branch key={root.id} node={root} depth={0} />)}
          </div>
        </div>
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
