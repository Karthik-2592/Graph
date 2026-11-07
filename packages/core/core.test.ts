// Run: node packages/core/core.test.ts
import { openDb, migrate } from "./db.ts";
import { createRun, upsertNodes, upsertEdges, insertSites, setCoverage, getRun, deleteRun, transaction } from "./store.ts";
import { fileId, symbolId } from "./ids.ts";
import { l1FileGraph, l2CallGraph } from "./projections.ts";
import { callers, callees, pathBetween, checkInvariants } from "./queries.ts";

const db = openDb(":memory:");
migrate(db); migrate(db); // idempotent
const run = createRun(db, { root: "fixtures/shop" });
const a = fileId("a.ts"), b = fileId("b.ts");
transaction(db, () => {
  upsertNodes(db, run, [
    { id: a, kind: "file", name: "a.ts", file_id: "a.ts", path: "a.ts" },
    { id: b, kind: "file", name: "b.ts", file_id: "b.ts", path: "b.ts" },
    { id: symbolId("a.ts", "f()."), kind: "function", name: "f", parent_id: a, file_id: "a.ts" },
    { id: symbolId("b.ts", "g()."), kind: "function", name: "g", parent_id: b, file_id: "b.ts" },
  ]);
  upsertEdges(db, run, [
    { src: a, dst: b, kind: "imports", provenance: "ts-imports", attrs: { via: "import" } },
    { src: symbolId("a.ts", "f()."), dst: symbolId("b.ts", "g()."), kind: "calls", provenance: "scip" },
  ]);
  insertSites(db, run, [{ kind: "unresolved-import", status: "unrecognized", path: "a.ts", line: 1, reason: "file-not-found" }]);
  setCoverage(db, run, { "files.parsed": "2" });
});
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
assert(getRun(db, run)?.root === "fixtures/shop", "run round-trip");
assert(l1FileGraph(db, run).length === 1 && l1FileGraph(db, run)[0].weight === 1, "L1 projection");
assert(l1FileGraph(db, run, ["imports", "uses"]).length === 1, "L1 with uses toggle");
assert(l2CallGraph(db, run).length === 1, "L2 projection");
assert(callees(db, run, symbolId("a.ts", "f().")).includes(symbolId("b.ts", "g().")), "callees");
assert(callers(db, run, symbolId("b.ts", "g().")).includes(symbolId("a.ts", "f().")), "callers");
assert((pathBetween(db, run, symbolId("a.ts", "f()."), symbolId("b.ts", "g().")) ?? []).length === 2, "path");
const inv = checkInvariants(db, run);
assert(inv.ok, `invariants: ${inv.problems.join(",")}`);
assert(deleteRun(db, run), "delete");
console.log("core.test: all passed");
