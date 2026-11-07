// ts-imports producer: wraps lib/parser behind the v5 producer interface.
// Framework adapters become optional enrichers (role attr, adapter:* provenance).
import { fileId, symbolId } from "../core/ids.ts";
import type { NodeRow, EdgeRow, SiteRow } from "../core/store.ts";
import type { ParseResult } from "../../lib/parser/types.ts";

export type ProducerOutput = { nodes: NodeRow[]; edges: EdgeRow[]; sites: SiteRow[]; coverage: Record<string, string> };

export function parseResultToGraph(result: ParseResult): ProducerOutput {
  const nodes: NodeRow[] = result.files.map((f) => ({
    id: fileId(f.path), kind: "file", name: f.path.split("/").pop() ?? f.path,
    file_id: f.path, path: f.path, role: f.role ?? null,
    attrs: { module: f.module, lines: f.lines, bytes: f.bytes, hash: f.hash, fanIn: f.fanIn, fanOut: f.fanOut, exports: f.exports, reachedBy: f.reachedBy },
  }));
  const edges: EdgeRow[] = result.edges.map((e) => ({
    src: fileId(e.source), dst: fileId(e.target), kind: "imports", provenance: "ts-imports",
    attrs: { via: e.kind, typeOnly: e.typeOnly, specifier: e.specifier, line: e.line },
  }));
  const sites: SiteRow[] = result.coverage.imports.unresolved.map((u) => ({
    kind: "unresolved-import", status: "unrecognized", path: u.from, line: u.line, reason: u.reason,
    node_id: fileId(u.from),
  }));
  const coverage: Record<string, string> = {
    "files.found": String(result.coverage.files.found),
    "files.parsed": String(result.coverage.files.parsed),
    "files.skipped": String(result.coverage.files.skipped),
    "imports.seen": String(result.coverage.imports.total.seen),
    "imports.internal": String(result.coverage.imports.total.internal),
    "imports.external": String(result.coverage.imports.total.external),
    "imports.unresolved": String(result.coverage.imports.total.unresolved),
    "routes.count": String(result.routes.length),
    "routes.omitted": String(result.coverage.routes.omitted.length),
    "routes.withheld": String(result.coverage.routes.withheld.length),
  };
  return { nodes, edges, sites, coverage };
}

/** Adapter enrichment: role + route nodes from legacy adapters. */
export function adapterEnrichment(result: ParseResult): { nodes: NodeRow[]; edges: EdgeRow[] } {
  const nodes: NodeRow[] = result.routes.map((r) => ({
    id: symbolId(r.file, `route:${r.method} ${r.pattern}`), kind: "route",
    name: `${r.method} ${r.pattern}`, file_id: r.file, path: r.file,
    attrs: { method: r.method, pattern: r.pattern, line: r.line, provenance: "adapter:routes" },
  }));
  const edges: EdgeRow[] = result.routes.map((r) => ({
    src: fileId(r.file), dst: symbolId(r.file, `route:${r.method} ${r.pattern}`), kind: "serves", provenance: "adapter:routes",
  }));
  return { nodes, edges };
}
