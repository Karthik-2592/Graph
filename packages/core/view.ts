// Viewer graph service: v5 run -> L1/L2 nodes/edges + neighbourhood expansion.
// Pure over the store; the browser never renders the whole call graph.
import type { Db } from "./db.ts";
import { l1FileGraph, l2CallGraph } from "./projections.ts";
import { callers, callees } from "./queries.ts";

export type ViewerNode = { id: string; label: string; kind: string; file: string };
export type ViewerEdge = { src: string; dst: string; kind: string; provenance: string; dashed: boolean };

export function l1ViewerGraph(db: Db, runId: number): { nodes: ViewerNode[]; edges: ViewerEdge[] } {
  const rows = db.prepare("SELECT id, name, kind, file_id FROM nodes WHERE run_id=? AND kind='file' ORDER BY id").all(runId) as { id: string; name: string; kind: string; file_id: string }[];
  const nodes: ViewerNode[] = rows.map((r) => ({ id: r.id, label: r.name, kind: r.kind, file: r.file_id }));
  const edges: ViewerEdge[] = l1FileGraph(db, runId).map((e) => ({ src: e.src, dst: e.dst, kind: e.kind, provenance: "ts-imports", dashed: false }));
  // l1FileGraph returns file_id pairs; viewer ids are file node ids — normalize.
  const byFile = new Map(rows.map((r) => [r.file_id, r.id]));
  return { nodes, edges: edges.map((e) => ({ ...e, src: byFile.get(e.src) ?? e.src, dst: byFile.get(e.dst) ?? e.dst })) };
}

export function l2ViewerGraph(db: Db, runId: number): { nodes: ViewerNode[]; edges: ViewerEdge[] } {
  const rows = db.prepare("SELECT id, name, kind, file_id FROM nodes WHERE run_id=? AND kind IN ('function','method','class','interface','property-function','module-init') ORDER BY id").all(runId) as { id: string; name: string; kind: string; file_id: string }[];
  const nodes: ViewerNode[] = rows.map((r) => ({ id: r.id, label: r.name, kind: r.kind, file: r.file_id }));
  const edges: ViewerEdge[] = l2CallGraph(db, runId).map((e) => ({ src: e.src, dst: e.dst, kind: e.kind, provenance: "scip", dashed: false }));
  return { nodes, edges };
}

/** Lazy neighbourhood: callees + callers to a depth, ids only. */
export function neighbourhood(db: Db, runId: number, nodeId: string, depth = 2): { callees: string[]; callers: string[] } {
  return { callees: callees(db, runId, nodeId, depth), callers: callers(db, runId, nodeId, depth) };
}
