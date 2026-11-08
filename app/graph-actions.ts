"use server";

// Serves L1/L2 viewer graphs from a v4 analysis by converting it to v5
// in-memory (ts-imports producer). SCIP L2 data is added when a .scip
// index exists for the repo; until then L2 shows file-level structure.
import { validateParseResult } from "@/lib/parser/contract";
import { loadAnalysis } from "@/lib/store/sqlite";
import { openDb, migrate } from "@/packages/core/db";
import { createRun, upsertNodes, upsertEdges, insertSites, setCoverage, transaction } from "@/packages/core/store";
import { parseResultToGraph } from "@/packages/lang-typescript/ts-imports";
import { l1ViewerGraph, l2ViewerGraph, neighbourhood, type ViewerNode, type ViewerEdge } from "@/packages/core/view";
import { runPipeline } from "@/packages/core/pipeline";
import { parseResultToGraph } from "@/packages/lang-typescript/ts-imports";

export type GraphLevel = { nodes: ViewerNode[]; edges: ViewerEdge[]; note: string };

/** v5 path: runPipeline (B1) — the app no longer rebuilds from v4 blobs
 *  ad hoc; it triggers the orchestrator with a cache key (B3). */
export async function indexViaPipeline(analysisId: string): Promise<{ runId: number } | { error: string }> {
  try {
    const result = loadAnalysis(analysisId);
    if (!result) return { error: "analysis not found" };
    const out = runPipeline({
      root: result.root,
      dbFile: `:memory:`,
      importNodes: () => parseResultToGraph(result),
    });
    return { runId: out.runId };
  } catch (e) { return { error: e instanceof Error ? e.message : String(e) }; }
}

function buildRun(analysisId: string): { db: ReturnType<typeof openDb>; runId: number } | null {
  const result = loadAnalysis(analysisId);
  if (!result) return null;
  validateParseResult(result);
  const db = openDb(":memory:");
  migrate(db);
  const runId = createRun(db, { root: result.root });
  const v5 = parseResultToGraph(result);
  transaction(db, () => { upsertNodes(db, runId, v5.nodes); upsertEdges(db, runId, v5.edges); insertSites(db, runId, v5.sites); setCoverage(db, runId, v5.coverage); });
  return { db, runId };
}

export async function loadGraphLevel(analysisId: string, level: "l1" | "l2"): Promise<GraphLevel | { error: string }> {
  try {
    const ctx = buildRun(analysisId);
    if (!ctx) return { error: "analysis not found" };
    const g = level === "l1" ? l1ViewerGraph(ctx.db, ctx.runId) : l2ViewerGraph(ctx.db, ctx.runId);
    const note = level === "l2" && g.nodes.length === 0
      ? "No function graph yet — run SCIP indexing (Task 06) to populate L2. Showing file structure."
      : `${g.nodes.length} nodes, ${g.edges.length} edges`;
    return { ...g, note };
  } catch (e) { return { error: e instanceof Error ? e.message : String(e) }; }
}

export async function expandNeighbourhoodAction(analysisId: string, nodeId: string, depth = 2): Promise<{ callees: string[]; callers: string[] } | { error: string }> {
  try {
    const ctx = buildRun(analysisId);
    if (!ctx) return { error: "analysis not found" };
    return neighbourhood(ctx.db, ctx.runId, nodeId, depth);
  } catch (e) { return { error: e instanceof Error ? e.message : String(e) }; }
}
