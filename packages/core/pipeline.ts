// runPipeline: one orchestrator for CLI + app (B1).
// detect languages → imports → SCIP → ingest → extractors →
// declarations → invariants → gates → store. Records producers (A1).
import { openDb, migrate } from "./db.ts";
import { createRun, upsertNodes, upsertEdges, insertSites, setCoverage, transaction } from "./store.ts";
import { recordProducers } from "./gates.ts";
import { checkInvariants } from "./invariants.ts";

export type PipelineResult = { runId: number; dbPath: string; producers: Record<string, string>; invariantOk: boolean };

export function runPipeline(opts: {
  root: string;
  mode?: "lenient" | "strict";
  dbFile: string;
  importNodes: (root: string) => { nodes: Parameters<typeof upsertNodes>[2]; edges: Parameters<typeof upsertEdges>[2]; sites: Parameters<typeof insertSites>[2]; coverage: Record<string, string> };
  scipNodes?: (root: string) => { nodes: Parameters<typeof upsertNodes>[2]; edges: Parameters<typeof upsertEdges>[2]; sites: Parameters<typeof insertSites>[2] } | null;
}): PipelineResult {
  const db = openDb(opts.dbFile);
  migrate(db);
  const runId = createRun(db, { root: opts.root, mode: opts.mode ?? "lenient" });
  const imp = opts.importNodes(opts.root);
  let scip: { nodes: Parameters<typeof upsertNodes>[2]; edges: Parameters<typeof upsertEdges>[2]; sites: Parameters<typeof insertSites>[2] } | null = null;
  try { scip = opts.scipNodes?.(opts.root) ?? null; } catch { scip = null; }
  const producers: Record<string, string> = { "ts-imports": "ran", scip: scip ? "ran" : "failed", extractors: "skipped", profile: "skipped", declarations: "skipped", walk: "ran" };
  transaction(db, () => {
    upsertNodes(db, runId, imp.nodes);
    upsertEdges(db, runId, imp.edges);
    insertSites(db, runId, imp.sites);
    setCoverage(db, runId, imp.coverage);
    if (scip) { upsertNodes(db, runId, scip.nodes); upsertEdges(db, runId, scip.edges); insertSites(db, runId, scip.sites); }
  });
  recordProducers(db, runId, producers);
  const inv = checkInvariants(db, runId);
  if (!inv.ok && opts.mode === "strict") throw new Error(`invariants failed: ${inv.problems.join("; ")}`);
  return { runId, dbPath: opts.dbFile, producers, invariantOk: inv.ok };
}
