// Scalability benchmark: synthetic 3k-node / ~6k-edge call graph
// (deterministic LCG, layered structure like a real call graph).
// Run: node spike-viewer-scalability.ts
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const N = 3000, E = 6000;
let seed = 42;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const nodes = Array.from({ length: N }, (_, i) => `file${Math.floor(i / 10)}::Fn${i}().`);
const edgeSet = new Set<string>();
while (edgeSet.size < E) { const a = Math.floor(rnd() * N), b = Math.floor(rnd() * N); if (a !== b && a < b + 50) edgeSet.add(`${a}\0${b}`); }
const edgeList = [...edgeSet].map((e) => e.split("\0").map((i) => nodes[+i]) as [string, string]);
console.log(`synthetic: nodes=${N} edges=${edgeList.length}`);

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
async function benchElk() {
  const ELK = require("elkjs");
  const elk = new ELK({ layered: { considerModelOrder: "PREFER_EDGE_LENGTH" } });
  const t0 = performance.now();
  const graph = { id: "root", layoutOptions: { "elk.algorithm": "layered", "elk.direction": "RIGHT" }, children: nodes.map((n) => ({ id: n, width: 180, height: 28 })), edges: edgeList.map(([s, t], i) => ({ id: `e${i}`, sources: [s], targets: [t] })) };
  await elk.layout(graph);
  return performance.now() - t0;
}
async function benchCytoscape() {
  const cytoscape = require("cytoscape");
  const t0 = performance.now();
  const cy = cytoscape({ headless: true, elements: [
    ...nodes.map((n) => ({ data: { id: n, parent: n.split("::")[0] } })),
    ...edgeList.map(([s, t], i) => ({ data: { id: `e${i}`, source: s, target: t } })),
  ]});
  const layout = cy.layout({ name: "cose", animate: false, nodeRepulsion: 8000 });
  await new Promise<void>((resolve) => { layout.on("layoutstop", () => resolve()); layout.run(); });
  cy.destroy();
  return performance.now() - t0;
}
console.log(`dagre: ${Math.round(benchDagre())} ms`);
console.log(`elk: ${Math.round(await benchElk())} ms`);
console.log(`cytoscape-cose-compound: ${Math.round(await benchCytoscape())} ms`);
console.log("versions: @dagrejs/dagre 3.1.3, elkjs 0.12.1, cytoscape 3.34.4");
