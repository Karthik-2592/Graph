// E4: declarations wiring. Load configured path, validate endpoints,
// insert declared edges (may=1), emit stale sites.
import type { Db } from "./db.ts";
import { loadDeclarations, declaredEdges } from "./declarations.ts";
import { insertSites } from "./store.ts";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export function wireDeclarations(db: Db, runId: number, root: string, declarationsPath: string): { inserted: number; stale: number } {
  const full = path.join(root, declarationsPath);
  if (!existsSync(full)) return { inserted: 0, stale: 0 };
  const decls = loadDeclarations(readFileSync(full, "utf8"));
  const { edges, stale } = declaredEdges(db, runId, decls);
  if (edges.length > 0) {
    const st = db.prepare("INSERT INTO edges (run_id,src,dst,kind,provenance,count,resolved,may,attrs) VALUES (?,?,?,?,?,?,?,?,?)");
    for (const e of edges) st.run(runId, e.src, e.dst, e.kind, e.provenance, e.count ?? 1, e.resolved ?? 1, e.may ?? 0, e.attrs ? JSON.stringify(e.attrs) : null);
  }
  if (stale.length > 0) insertSites(db, runId, stale.map((s) => ({ kind: "stale-declaration", status: "unrecognized", path: s.from, reason: "declaration endpoint missing (G8)" })));
  return { inserted: edges.length, stale: stale.length };
}
