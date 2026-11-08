// Run: node packages/core/view.test.ts
import { openDb, migrate } from "./db.ts";
import { createRun, upsertNodes, upsertEdges } from "./store.ts";
import { l1ViewerGraph, l2ViewerGraph, neighbourhood } from "./view.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
const db = openDb(":memory:"); migrate(db);
const run = createRun(db, { root: "x" });
upsertNodes(db, run, [
  { id: "a.ts::", kind: "file", name: "a.ts", file_id: "a.ts" },
  { id: "b.ts::", kind: "file", name: "b.ts", file_id: "b.ts" },
  { id: "a.ts::f().", kind: "function", name: "f", file_id: "a.ts" },
  { id: "b.ts::g().", kind: "function", name: "g", file_id: "b.ts" },
]);
upsertEdges(db, run, [
  { src: "a.ts::", dst: "b.ts::", kind: "imports", provenance: "ts-imports" },
  { src: "a.ts::f().", dst: "b.ts::g().", kind: "calls", provenance: "scip" },
]);
assert(l1ViewerGraph(db, run).edges.length === 1, "L1 edge");
assert(l2ViewerGraph(db, run).edges.length === 1, "L2 edge");
assert(neighbourhood(db, run, "a.ts::f().").callees.includes("b.ts::g()."), "neighbourhood callees");
assert(neighbourhood(db, run, "b.ts::g().").callers.includes("a.ts::f()."), "neighbourhood callers");
console.log("view.test: all passed");
