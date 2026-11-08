"use client";

// L1/L2 toggle + lazy neighbourhood expansion (Task 13).
// Loads the viewer graph from the server action; expansion is a
// depth-limited server query, never a full-graph render by default.
import { useCallback, useEffect, useState } from "react";
import { expandNeighbourhoodAction, loadGraphLevel, type GraphLevel } from "@/app/graph-actions";

export function GraphLevels({ analysisId }: { analysisId: string }) {
  const [level, setLevel] = useState<"l1" | "l2">("l1");
  const [graph, setGraph] = useState<GraphLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hood, setHood] = useState<{ callees: string[]; callers: string[] } | null>(null);

  useEffect(() => {
    loadGraphLevel(analysisId, level).then((r) => {
      if ("error" in r) setError(r.error);
      else { setGraph(r); setError(null); setSelected(null); setHood(null); }
    });
  }, [analysisId, level]);

  const expand = useCallback((nodeId: string) => {
    setSelected(nodeId);
    expandNeighbourhoodAction(analysisId, nodeId, 2).then((r) => { if (!("error" in r)) setHood(r); });
  }, [analysisId]);

  if (error) return <div className="p-3 text-xs text-red-600">{error}</div>;
  return (
    <div className="absolute inset-0 flex flex-col bg-surface">
      <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-1 text-[11px]">
        <button type="button" className={level === "l1" ? "text-fg" : "text-fg-muted"} onClick={() => setLevel("l1")}>L1 · Files</button>
        <span className="text-fg-muted">/</span>
        <button type="button" className={level === "l2" ? "text-fg" : "text-fg-muted"} onClick={() => setLevel("l2")}>L2 · Functions</button>
        <span className="ml-auto text-fg-muted">{graph?.note ?? "loading…"}</span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_16rem]">
        <div className="overflow-auto p-2">
          {graph && graph.nodes.length > 0 ? (
            <ul className="space-y-0.5">
              {graph.nodes.map((n) => (
                <li key={n.id}>
                  <button type="button" className={`w-full truncate rounded px-1 py-0.5 text-left font-mono text-[11px] ${selected === n.id ? "bg-accent/10 text-fg" : "text-fg-muted hover:text-fg"}`} onClick={() => expand(n.id)}>
                    <span className="mr-1 text-fg-muted">{n.kind}</span>{n.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="p-2 text-xs text-fg-muted">No nodes at this level.</p>}
        </div>
        <aside className="border-l border-line p-2 text-[11px]">
          {selected && hood ? (
            <>
              <h3 className="mb-1 break-all font-mono text-fg-muted">{selected}</h3>
              <h4 className="font-mono text-fg-muted">Callees ({hood.callees.length})</h4>
              <ul className="mb-2 space-y-0.5">{hood.callees.map((c) => <li key={c} className="break-all font-mono">{c}</li>)}</ul>
              <h4 className="font-mono text-fg-muted">Callers ({hood.callers.length})</h4>
              <ul className="space-y-0.5">{hood.callers.map((c) => <li key={c} className="break-all font-mono">{c}</li>)}</ul>
            </>
          ) : <p className="text-fg-muted">Select a node to expand its neighbourhood (depth 2).</p>}
        </aside>
      </div>
    </div>
  );
}
