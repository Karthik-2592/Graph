// Bounded scalability benchmark: one layout per invocation, size via argv.
// Run: node spike-viewer-scalability2.ts <dagre|elk|cytoscape> <n> <e>
// The caller (shell) applies a hard timeout; completing = measurement.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const [algo, nArg, eArg] = process.argv.slice(2);
const N = +nArg, E = +(eArg ?? Math.round(N * 2));
let seed = 42;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const nodes = Array.from({ length: N }, (_, i) => `file${Math.floor(i / 10)}::Fn${i}().`);
const edgeSet = new Set<string>();
let guard = 0;
while (edgeSet.size < E && guard++ < E * 100) { const a = Math.floor(rnd() * N), b = Math.floor(rnd() * N); if (a !== b && a < b + 50) edgeSet.add(`${a}\0${b}`); }
const edgeList = [...edgeSet].map((e) => e.split("\0").map((i) => nodes[+i]) as [string, string]);

async function main() {
  const t0 = performance.now();
  if (algo === "dagre") {
    const dagre = require("@dagrejs/dagre");
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "LR", nodesep: 16, ranksep: 72 });
    g.setDefaultEdgeLabel(() => ({}));
    for (const n of nodes) g.setNode(n, { width: 180, height: 28 });
    for (const [s, t] of edgeList) g.setEdge(s, t);
    dagre.layout(g);
  } else if (algo === "elk") {
    const ELK = require("elkjs");
    const elk = new ELK({ layered: { considerModelOrder: "PREFER_EDGE_LENGTH" } });
    await elk.layout({ id: "root", layoutOptions: { "elk.algorithm": "layered", "elk.direction": "RIGHT", "elk.layered.crossingMinimization.sifting.maxIterations": 5 }, children: nodes.map((n) => ({ id: n, width: 180, height: 28 })), edges: edgeList.map(([s, t], i) => ({ id: `e${i}`, sources: [s], targets: [t] })) });
  } else if (algo === "cytoscape") {
    const cytoscape = require("cytoscape");
    const cy = cytoscape({ headless: true, elements: [
      ...nodes.map((n) => ({ data: { id: n, parent: n.split("::")[0] } })),
      ...edgeList.map(([s, t], i) => ({ data: { id: `e${i}`, source: s, target: t } })),
    ]});
    const layout = cy.layout({ name: "cose", animate: false, nodeRepulsion: 8000, maxIterations: 200, tolerance: 1e-4 });
    await new Promise<void>((resolve) => { layout.on("layoutstop", () => resolve()); layout.run(); });
    cy.destroy();
  } else throw new Error(`unknown algo ${algo}`);
  console.log(JSON.stringify({ algo, nodes: N, edges: edgeList.length, ms: Math.round(performance.now() - t0) }));
}
await main();
