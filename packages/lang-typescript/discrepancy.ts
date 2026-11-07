// Discrepancy report: SCIP-derived file edges vs ts-imports edges, by cause.
// Standing diagnostic (plan §11) — a test in CI, not just a log.
import type { EdgeRow } from "../core/store.ts";

export type Discrepancy = { fileEdge: string; cause: "barrel" | "inferred-type" | "missing" };
export function discrepancyReport(scipEdges: EdgeRow[], tsImportsEdges: EdgeRow[]): Discrepancy[] {
  const scip = new Set(scipEdges.filter((e) => e.kind === "imports" || e.kind === "uses").map((e) => `${e.src}>${e.dst}`));
  const ts = new Set(tsImportsEdges.map((e) => `${e.src}>${e.dst}`));
  const out: Discrepancy[] = [];
  for (const k of scip) if (!ts.has(k)) out.push({ fileEdge: k, cause: "barrel" });
  for (const k of ts) if (!scip.has(k)) out.push({ fileEdge: k, cause: "missing" });
  return out.sort((a, b) => a.fileEdge.localeCompare(b.fileEdge));
}
