// scip-python runner (Phase 6). Requires an installed environment;
// `graph doctor` flags its absence. Reads via @scip-code/scip bindings.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fromBinary } from "@bufbuild/protobuf";
import { IndexSchema } from "@scip-code/scip";
import { parse, normalize } from "./symbols.ts";
import { symbolId } from "../core/ids.ts";
import type { NodeRow, EdgeRow, SiteRow } from "../core/store.ts";

export function runPythonIndexer(root: string, out: string): { nodes: NodeRow[]; edges: EdgeRow[]; sites: SiteRow[] } {
  execFileSync("scip-python", ["index", "--cwd", root, "--output", out], { stdio: "pipe" });
  // grimp cross-check for Level 1 (best-effort; missing env -> site).
  const sites: SiteRow[] = [];
  if (!existsSync(path.join(root, ".venv")) && !process.env.VIRTUAL_ENV) {
    sites.push({ kind: "file-outside-program", status: "unrecognized", path: root, reason: "python environment not installed — external symbols absent" });
  }
  const index = fromBinary(IndexSchema, readFileSync(out));
  const defsite = new Map<string, string>();
  const nodesById = new Map<string, NodeRow>();
  const occs: [string, readonly number[], string][] = [];
  const rng = (r: readonly number[]): readonly number[] => (r.length === 3 ? [r[0], r[1], r[0], r[2]] : r);
  for (const doc of index.documents) {
    const f = doc.relativePath.split("\\").join("/");
    if (!nodesById.has(`${f}::`)) nodesById.set(`${f}::`, { id: `${f}::`, kind: "file", name: f.split("/").pop() ?? f, file_id: f, path: f, lang: "python" });
    for (const o of doc.occurrences) {
      if (o.symbol.startsWith("local")) continue;
      if (o.symbolRoles & 1) {
        const p = parse(o.symbol);
        if (!p) continue;
        const id = symbolId(f, normalize(p.descriptor));
        defsite.set(o.symbol, id);
        if (!nodesById.has(id)) nodesById.set(id, { id, kind: "function", name: p.descriptor.split("#").pop() ?? p.descriptor, parent_id: `${f}::`, file_id: f, path: f, lang: "python", attrs: { rawSymbol: o.symbol } });
      } else occs.push([f, rng(o.range), o.symbol]);
    }
  }
  const edges: EdgeRow[] = [];
  const seen = new Set<string>();
  for (const [f, r, sym] of occs) {
    const target = defsite.get(sym);
    if (!target) { sites.push({ kind: "computed-call", status: "unrecognized", path: f, line: r[0], reason: "unresolved dynamic call (mixin/decorator)" }); continue; }
    const src = `${f}::`;
    const k = `${src}>${target}`;
    if (seen.has(k) || src === target) continue;
    seen.add(k);
    edges.push({ src, dst: target, kind: "calls", provenance: "scip" });
  }
  return { nodes: [...nodesById.values()], edges, sites };
}
