// Run: node packages/core/invariants.test.ts
import { openDb, migrate } from "./db.ts";
import { createRun, upsertNodes, upsertEdges } from "./store.ts";
import { checkInvariants } from "./invariants.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
const db = openDb(":memory:"); migrate(db);
const run = createRun(db, { root: "x" });
upsertNodes(db, run, [
  { id: "a.ts::", kind: "file", name: "a.ts", file_id: "a.ts" },
  { id: "b.ts::", kind: "file", name: "b.ts", file_id: "b.ts" },
  { id: "a.ts::f().", kind: "function", name: "f", parent_id: "a.ts::", file_id: "a.ts" },
]);
upsertEdges(db, run, [{ src: "a.ts::", dst: "b.ts::", kind: "imports", provenance: "ts-imports" }]);
assert(checkInvariants(db, run).ok, "clean graph passes");
upsertEdges(db, run, [{ src: "a.ts::", dst: "gone::", kind: "calls", provenance: "scip" }]);
const bad = checkInvariants(db, run);
assert(!bad.ok && bad.problems.some((p) => p.includes("missing endpoints")), `dangling edge caught: ${bad.problems}`);
console.log("invariants.test: all passed");
