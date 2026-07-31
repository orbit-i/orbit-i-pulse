// components/global-search.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, UserIcon, BriefcaseIcon, FileTextIcon, XIcon } from "@/components/icons";
import { Avatar } from "@/components/ui-bits";

type Results = {
  people: { id: string; full_name: string; role: string; job_title: string | null; avatar_url: string | null }[];
  tasks: { id: string; title: string; status: string }[];
  documents: { id: string; title: string }[];
};

export function GlobalSearch({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setResults(null); return; }
    setLoading(true);
    const id = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) setResults(await res.json());
      setLoading(false);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  function go(path: string) {
    setOpen(false);
    setQ("");
    setResults(null);
    router.push(path);
  }

  const hasResults = results && (results.people.length + results.tasks.length + results.documents.length > 0);

  return (
    <div ref={boxRef} style={{ position: "relative", flex: 1, maxWidth: 380 }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: "0.65rem", top: "50%", transform: "translateY(-50%)", color: dark ? "rgba(255,255,255,0.5)" : "var(--gray-400)", display: "flex", pointerEvents: "none" }}>
          <SearchIcon size={14} />
        </span>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search people, tasks, documents…"
          style={{
            width: "100%",
            padding: "0.45rem 2rem 0.45rem 2.1rem",
            borderRadius: 999,
            border: dark ? "1px solid rgba(255,255,255,0.14)" : "1px solid var(--border)",
            background: dark ? "rgba(255,255,255,0.07)" : "var(--gray-100, #f1f5f9)",
            color: dark ? "#fff" : "inherit",
            fontSize: "0.82rem",
            outline: "none",
          }}
        />
        {q && (
          <button onClick={() => { setQ(""); setResults(null); }} style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: dark ? "rgba(255,255,255,0.5)" : "var(--gray-400)", display: "flex" }}>
            <XIcon size={13} />
          </button>
        )}
      </div>

      {open && q.trim().length >= 2 && (
        <div className="card" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, width: 340, maxWidth: "calc(100vw - 2rem)", maxHeight: 400, overflowY: "auto", zIndex: 60, padding: "0.6rem", boxShadow: "0 12px 32px rgba(0,0,0,0.18)" }}>
          {loading ? (
            <p className="text-sm text-muted" style={{ padding: "0.5rem" }}>Searching…</p>
          ) : !hasResults ? (
            <p className="text-sm text-muted" style={{ padding: "0.5rem" }}>No matches for "{q}".</p>
          ) : (
            <>
              {results!.people.length > 0 && (
                <div style={{ marginBottom: "0.5rem" }}>
                  <div className="text-xs text-muted" style={{ padding: "0.3rem 0.5rem", fontWeight: 700 }}>PEOPLE</div>
                  {results!.people.map((p) => (
                    <button key={p.id} onClick={() => go("/dashboard/org-chart")} className="search-result-row">
                      <Avatar name={p.full_name} size="sm" imageUrl={p.avatar_url} />
                      <div style={{ minWidth: 0, textAlign: "left" }}>
                        <div style={{ fontWeight: 600, fontSize: "0.83rem" }}>{p.full_name}</div>
                        <div className="text-xs text-muted">{p.job_title || p.role}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results!.tasks.length > 0 && (
                <div style={{ marginBottom: "0.5rem" }}>
                  <div className="text-xs text-muted" style={{ padding: "0.3rem 0.5rem", fontWeight: 700 }}>TASKS</div>
                  {results!.tasks.map((t) => (
                    <button key={t.id} onClick={() => go("/dashboard/tasks")} className="search-result-row">
                      <BriefcaseIcon size={15} />
                      <div style={{ minWidth: 0, textAlign: "left" }}>
                        <div style={{ fontWeight: 600, fontSize: "0.83rem" }}>{t.title}</div>
                        <div className="text-xs text-muted">{t.status.replace("_", " ")}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results!.documents.length > 0 && (
                <div>
                  <div className="text-xs text-muted" style={{ padding: "0.3rem 0.5rem", fontWeight: 700 }}>DOCUMENTS</div>
                  {results!.documents.map((d) => (
                    <button key={d.id} onClick={() => go("/dashboard/documents")} className="search-result-row">
                      <FileTextIcon size={15} />
                      <div style={{ fontWeight: 600, fontSize: "0.83rem", textAlign: "left" }}>{d.title}</div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
