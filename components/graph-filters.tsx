"use client";
// G5: edge-kind filters + provenance styling (dashed for may/declared/heuristic).
// G6: class→method nesting groups (from C4 hierarchy).
import { useMemo, useState } from "react";
import type { ViewerEdge } from "@/packages/core/view";

export function GraphFilters({ edges, onFilter }: { edges: ViewerEdge[]; onFilter: (kinds: Set<string>) => void }) {
  const kinds = useMemo(() => [...new Set(edges.map((e) => e.kind))].sort(), [edges]);
  const [on, setOn] = useState<Set<string>>(() => new Set(kinds));
  const toggle = (k: string) => { const next = new Set(on); next.has(k) ? next.delete(k) : next.add(k); setOn(next); onFilter(next); };
  return (
    <div className="flex flex-wrap gap-1 p-1 text-[11px]">
      {kinds.map((k) => (
        <button key={k} type="button" className={`rounded border px-1 ${on.has(k) ? "border-accent text-fg" : "border-line text-fg-muted"}`} onClick={() => toggle(k)}>{k}</button>
      ))}
    </div>
  );
}

export function provenanceStyle(provenance: string, may: number): { dashed: boolean } {
  return { dashed: may === 1 || provenance === "declared" || provenance === "heuristic" };
}

export function nestingGroups(nodes: { id: string; kind: string }[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const n of nodes) {
    const parent = n.id.includes("#") ? n.id.slice(0, n.id.indexOf("#") + 1) : n.id.split("::")[0];
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent)!.push(n.id);
  }
  return groups;
}
