// One ingestion core, many language plugins (F1). TypeScript, Python,
// and Go become plugins; the copied ingesters are deleted.
import type { NodeRow, EdgeRow, SiteRow } from "./store.ts";
import { symbolId } from "./ids.ts";

export type Plugin = {
  id: string;
  parse(symbol: string): { file: string; descriptor: string } | null;
  normalize(descriptor: string): string;
  kindOf(descriptor: string): string;
  isNoise(symbol: string): boolean;
  isExternal(symbol: string): boolean;
  // File path comes from document.relativePath, not the symbol string.
};

export type IndexDocument = { relativePath: string; occurrences: { symbol: string; symbolRoles: number; range: readonly number[]; enclosingRange?: readonly number[] }[] };

function rng(r: readonly number[]): readonly number[] { return r.length === 3 ? [r[0], r[1], r[0], r[2]] : r; }
function contains(o: readonly number[], i: readonly number[]): boolean {
  return (o[0] < i[0] || (o[0] === i[0] && o[1] <= i[1])) && (o[2] > i[2] || (o[2] === i[2] && i[3] <= o[3]));
}

export function ingestIndex(documents: IndexDocument[], plugin: Plugin): { nodes: NodeRow[]; edges: EdgeRow[]; sites: SiteRow[] } {
  const defsite = new Map<string, string>();
  const encl = new Map<string, [readonly number[], string][]>();
  const nodesById = new Map<string, NodeRow>();
  const occs: [string, readonly number[], string][] = [];
  const sites: SiteRow[] = [];
  for (const doc of documents) {
    const f = doc.relativePath.split("\\").join("/");
    if (!nodesById.has(`${f}::`)) nodesById.set(`${f}::`, { id: `${f}::`, kind: "file", name: f.split("/").pop() ?? f, file_id: f, path: f, lang: plugin.id });
    for (const o of doc.occurrences) {
      if (o.symbol.startsWith("local")) continue;
      if (o.symbolRoles & 1) {
        const p = plugin.parse(o.symbol);
        if (!p || plugin.isNoise(o.symbol)) continue;
        const id = symbolId(f, plugin.normalize(p.descriptor));
        defsite.set(o.symbol, id);
        if (!nodesById.has(id)) nodesById.set(id, { id, kind: plugin.kindOf(p.descriptor), name: p.descriptor, parent_id: `${f}::`, file_id: f, path: f, lang: plugin.id, attrs: { rawSymbol: o.symbol } });
        if (o.enclosingRange && o.enclosingRange.length > 0) encl.set(f, [...(encl.get(f) ?? []), [rng(o.enclosingRange), id]]);
      } else occs.push([f, rng(o.range), o.symbol]);
    }
  }
  const edges: EdgeRow[] = [];
  const seen = new Set<string>();
  for (const [f, r, sym] of occs) {
    const target = defsite.get(sym);
    if (!target) continue;
    let best: [readonly number[], string] | null = null;
    for (const [er, cid] of encl.get(f) ?? []) if (contains(er, r) && (!best || contains(best[0], er))) best = [er, cid];
    const src = best?.[1] ?? `${f}::`;
    if (src === target) continue;
    const k = `${src}>${target}`;
    if (seen.has(k)) continue;
    seen.add(k);
    edges.push({ src, dst: target, kind: "calls", provenance: "scip" });
  }
  return { nodes: [...nodesById.values()], edges, sites };
}
