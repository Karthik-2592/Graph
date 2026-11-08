// Spike: viewer stack benchmark on the real graph-repo call graph.
// Run: node spike-viewer.ts [index.scip]
// Compares: (a) dagre (existing layout.ts approach), (b) elkjs layered,
// (c) cytoscape compound (headless layout = cose, no DOM needed for timing).
import { readFileSync } from "node:fs";
import { fromBinary } from "@bufbuild/protobuf";
import { IndexSchema } from "@scip-code/scip";

const file = process.argv[2] ?? "graph-experiments/indexes/graph-repo.scip";
const index = fromBinary(IndexSchema, readFileSync(file));

// Reuse the experiment's derivation (silently-drop-free subset): defs + enclosing ranges.
function rng(r: any) { return r.length === 3 ? [r[0], r[1], r[0], r[2]] : r; }
function contains(o: any[], i: any[]) { return o[0] <= i[0] && o[1] <= i[1] && i[2] <= o[2] && i[3] <= o[3]; }
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const defsite = new Map<string, string>(), encl = new Map<string, [any[], string][]>();
const occs: [string, any[], string][] = [];
for (const doc of index.documents) {
  for (const o of doc.occurrences) {
    if (o.symbol.startsWith("local")) continue;
    if (o.symbolRoles & 1) {
      const m = o.symbol.match(/`[^`]*\.(?:tsx?|jsx?)`\/(.*)$/);
      if (!m) continue;
      const id = `${doc.relativePath}::${m[1].replace("`<constructor>`().", "")}`;
      defsite.set(o.symbol, id);
      if (o.enclosingRange) encl.set(doc.relativePath, [...(encl.get(doc.relativePath) ?? []), [rng(o.enclosingRange), id]]);
    } else occs.push([doc.relativePath, rng(o.range), o.symbol]);
  }
}
const edges = new Set<string>();
for (const [f, r, sym] of occs) {
  const t = defsite.get(sym); if (!t) continue;
  let best: [any[], string] | null = null;
  for (const [er, cid] of encl.get(f) ?? []) if (contains(er, r) && (!best || contains(best[0], er))) best = [er, cid];
  if (best && best[1] !== t) edges.add(`${best[1]}\0${t}`);
}
const nodes = [...new Set([...edges].flatMap((e) => e.split("\0")))].sort();
const edgeList = [...edges].map((e) => e.split("\0") as [string, string]);
console.log(`nodes=${nodes.length} edges=${edgeList.length} file=${file}`);

// ---- (a) dagre (existing) ----
const dagre = require("@dagrejs/dagre");
function benchDagre() {
  const t0 = performance.now();
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 16, ranksep: 72 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) g.setNode(n, { width: 180, height: 28 });
  for (const [s, t] of edgeList) g.setEdge(s, t);
  dagre.layout(g);
  return performance.now() - t0;
}
// ---- (b) ELK ----
async function benchElk() {
  const ELK = require("elkjs");
  const elk = new ELK({ layered: { considerModelOrder: "PREFER_EDGE_LENGTH" } });
  const t0 = performance.now();
  const graph = { id: "root", layoutOptions: { "elk.algorithm": "layered", "elk.direction": "RIGHT" }, children: nodes.map((n) => ({ id: n, width: 180, height: 28 })), edges: edgeList.map(([s, t], i) => ({ id: `e${i}`, sources: [s], targets: [t] })) };
  await elk.layout(graph);
  return performance.now() - t0;
}
// ---- (c) cytoscape compound ----
async function benchCytoscape() {
  const cytoscape = require("cytoscape");
  // Compound: parent = file dir, child = node
  const t0 = performance.now();
  const cy = cytoscape({ headless: true, elements: [
    ...nodes.map((n) => ({ data: { id: n, parent: n.split("::")[0] } })),
    ...edgeList.map(([s, t], i) => ({ data: { id: `e${i}`, source: s, target: t } })),
  ]});
  const layout = cy.layout({ name: "cose", animate: false });
  await new Promise<void>((resolve) => { layout.on("layoutstop", () => resolve()); layout.run(); });
  cy.destroy();
  return performance.now() - t0;
}
const { readFileSync: _r } = await import("node:fs");
console.log(`dagre: ${Math.round(benchDagre())} ms`);
console.log(`elk: ${Math.round(await benchElk())} ms`);
console.log(`cytoscape-cose-compound: ${Math.round(await benchCytoscape())} ms`);
console.log(`bundle: dagre ${require("@dagrejs/dagre/package.json").version} elkjs ${require("elkjs/package.json").version} cytoscape ${JSON.parse(readFileSync(new URL("node_modules/cytoscape/package.json", `file:///${process.cwd()}/`), "utf8")).version}`);
