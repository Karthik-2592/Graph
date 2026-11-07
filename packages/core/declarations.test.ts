// Run: node packages/core/declarations.test.ts
import { openDb, migrate } from "./db.ts";
import { createRun, upsertNodes } from "./store.ts";
import { loadDeclarations, declaredEdges, expandHandlerTable } from "./declarations.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
const db = openDb(":memory:"); migrate(db);
const run = createRun(db, { root: "x" });
upsertNodes(db, run, [
  { id: "a::Gateway#charge().", kind: "method", name: "charge" },
  { id: "b::Stripe#charge().", kind: "method", name: "charge" },
]);
const decls = loadDeclarations(JSON.stringify({ version: 1, edges: [{ from: "a::Gateway#charge().", to: ["b::Stripe#charge()."], kind: "calls", note: "by config" }] }));
const { edges, stale } = declaredEdges(db, run, decls);
assert(edges.length === 1 && edges[0].may === 1 && edges[0].provenance === "declared", "declared edge");
assert(stale.length === 0, "no stale");
const bad = declaredEdges(db, run, [{ from: "a::Gateway#charge().", to: ["gone::x"], kind: "calls" }]);
assert(bad.stale.length === 1, "stale detected (G8)");
assert(expandHandlerTable(["m1", "m2"], ["d1"]).length === 2, "handler table expands");
console.log("declarations.test: all passed");
