// SCIP ingestion → v5 nodes/edges (Task 06). Derivation:
// occurrence → smallest enclosing definition → target definition.
import { fromBinary } from "@bufbuild/protobuf";
import { IndexSchema } from "@scip-code/scip";
import { readFileSync } from "node:fs";
import { parse, normalize, isNoise, isLocal } from "./symbols.ts";
import { fileId, symbolId } from "../core/ids.ts";
import type { NodeRow, EdgeRow } from "../core/store.ts";

function rng(r: readonly number[]): [number, number, number, number] {
  return r.length === 3 ? [r[0], r[1], r[0], r[2]] : [r[0], r[1], r[2], r[3]];
}
function contains(o: readonly number[], i: readonly number[]): boolean {
  return o[0] <= i[0] && o[1] <= i[1] && i[2] <= o[2] && i[3] <= o[3];
}

export type IngestResult = { nodes: NodeRow[]; edges: EdgeRow[]; documents: number };

export function ingestScip(file: string, opts: { roleAt?: (line: string, col: number) => string } = {}): IngestResult {
  const index = fromBinary(IndexSchema, readFileSync(file));
  const defsite = new Map<string, string>();
  const encl = new Map<string, [readonly number[], string][]>();
  const nodesById = new Map<string, NodeRow>();
  const occs: [string, readonly number[], string][] = [];

  for (const doc of index.documents) {
    const f = doc.relativePath.split("\\").join("/"); // Windows indexers emit backslashes; truth uses posix
    if (!nodesById.has(fileId(f))) nodesById.set(fileId(f), { id: fileId(f), kind: "file", name: f.split("/").pop() ?? f, file_id: f, path: f });
    for (const o of doc.occurrences) {
      if (isLocal(o.symbol)) continue;
      if (o.symbolRoles & 1) {
        const p = parse(o.symbol);
        if (!p || isNoise(o.symbol)) continue;
        const id = symbolId(f, normalize(p.descriptor));
        defsite.set(o.symbol, id);
        if (!nodesById.has(id)) {
          const last = p.descriptor.split("#").pop() ?? p.descriptor;
          const isClass = /#$/.test(p.descriptor) || /^[A-Z]/.test(last);
          nodesById.set(id, { id, kind: isClass ? "class" : "function", name: last.replace(/\(\)\.$/, ""), parent_id: fileId(f), file_id: f, path: f, attrs: { rawSymbol: o.symbol } });
        }
        if (o.enclosingRange) encl.set(f, [...(encl.get(f) ?? []), [rng(o.enclosingRange), id]]);
      } else occs.push([f, rng(o.range), o.symbol]);
    }
  }
  const edgesByKey = new Map<string, EdgeRow>();
  const add = (src: string, dst: string, kind: string) => {
    const k = `${src}\0${dst}\0${kind}`;
    const prev = edgesByKey.get(k);
    if (prev) prev.count = (prev.count ?? 1) + 1;
    else edgesByKey.set(k, { src, dst, kind, provenance: "scip", count: 1 });
  };
  for (const [f, r, sym] of occs) {
    const target = defsite.get(sym);
    if (!target) continue;
    // Smallest enclosing definition (refined scopes from Task 07 plug in here).
    let best: [readonly number[], string] | null = null;
    for (const [er, cid] of encl.get(f) ?? []) if (contains(er, r) && (!best || contains(best[0], er))) best = [er, cid];
    if (!best || best[1] === target) continue;
    const role = opts.roleAt?.("", r[1]) ?? "calls";
    add(best[1], target, role === "new" || target.endsWith("#") ? "instantiates" : role === "jsx" ? "renders" : role === "reference" ? "references" : "calls");
  }
  return { nodes: [...nodesById.values()], edges: [...edgesByKey.values()], documents: index.documents.length };
}
