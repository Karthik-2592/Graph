// Go runner: scip-go index + same @scip-code/scip reading path as TS.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fromBinary } from "@bufbuild/protobuf";
import { IndexSchema } from "@scip-code/scip";
import { parse, normalize } from "./symbols.ts";
import { symbolId } from "../core/ids.ts";
import type { NodeRow, EdgeRow } from "../core/store.ts";

export function runGoIndexer(root: string, out: string): { nodes: NodeRow[]; edges: EdgeRow[] } {
  execFileSync("scip-go", ["index", "--cwd", root, "--output", out], { stdio: "pipe" });
  const index = fromBinary(IndexSchema, readFileSync(out));
  const defsite = new Map<string, string>();
  const nodesById = new Map<string, NodeRow>();
  const occs: [string, readonly number[], string][] = [];
  const rng = (r: readonly number[]): readonly number[] => (r.length === 3 ? [r[0], r[1], r[0], r[2]] : r);
  for (const doc of index.documents) {
    const f = doc.relativePath.split("\\").join("/");
    if (!nodesById.has(`${f}::`)) nodesById.set(`${f}::`, { id: `${f}::`, kind: "file", name: f.split("/").pop() ?? f, file_id: f, path: f, lang: "go" });
    for (const o of doc.occurrences) {
      if (o.symbol.startsWith("local")) continue;
      if (o.symbolRoles & 1) {
        const p = parse(o.symbol);
        if (!p) continue;
        const id = symbolId(f, normalize(p.descriptor));
        defsite.set(o.symbol, id);
        if (!nodesById.has(id)) nodesById.set(id, { id, kind: "function", name: p.descriptor, parent_id: `${f}::`, file_id: f, path: f, lang: "go", attrs: { rawSymbol: o.symbol } });
      } else occs.push([f, rng(o.range), o.symbol]);
    }
  }
  const edges: EdgeRow[] = [];
  const seen = new Set<string>();
  for (const [f, , sym] of occs) {
    const target = defsite.get(sym);
    if (!target) continue;
    const src = `${f}::`;
    const k = `${src}>${target}`;
    if (seen.has(k) || src === target) continue;
    seen.add(k);
    edges.push({ src, dst: target, kind: "calls", provenance: "scip" });
  }
  return { nodes: [...nodesById.values()], edges };
}
