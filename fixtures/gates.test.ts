// Gate behavior matrix (E5): each gate has failing, passing, and
// not-evaluated cases. Run: node fixtures/gates.test.ts
import { openDb, migrate } from "../packages/core/db.ts";
import { createRun, insertSites, transaction } from "../packages/core/store.ts";
import { checkGates, recordProducers } from "../packages/core/gates.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
function runWith(sites: Parameters<typeof insertSites>[2], producers: Record<string, "ran"|"skipped"|"failed">) {
  const db = openDb(":memory:"); migrate(db);
  const run = createRun(db, { root: "x" });
  transaction(db, () => insertSites(db, run, sites));
  recordProducers(db, run, producers);
  return checkGates(db, run, { strict: true });
}
const ALL_RUN: Record<string, "ran"|"skipped"|"failed"> = { "ts-imports": "ran", scip: "ran", walk: "ran", profile: "ran", extractors: "ran", declarations: "ran" };
// shop-strict: all producers ran, no sites -> all evaluated pass
const pass = runWith([], ALL_RUN);
assert(pass.unevaluated.length === 0 && pass.failed.length === 0, "shop-strict: all pass as evaluated");
// shop: G4+G5 fail
const shop = runWith([
  { kind: "network-call", status: "unrecognized", path: "frontend/src/api/client.ts", line: 1 },
  { kind: "route-registration", status: "unrecognized", path: "backend/src/routes/index.ts", line: 1 },
], ALL_RUN);
assert(shop.failed.includes("G4") && shop.failed.includes("G5"), `shop fails G4+G5: ${shop.failed}`);
// shop-dynamic: G6 fails on the one non-literal emit
const dyn = runWith([{ kind: "event-emit", status: "unrecognized", path: "backend/src/services/orderService.ts", line: 14 }], ALL_RUN);
assert(dyn.failed.includes("G6"), "shop-dynamic fails G6");
// iface: undeclared dispatch fails G7; declared passes
const iface = runWith([{ kind: "interface-dispatch", status: "unrecognized", path: "gateway.ts" }], ALL_RUN);
assert(iface.failed.includes("G7"), "undeclared dispatch fails G7");
const ifaceDeclared = runWith([{ kind: "interface-dispatch", status: "declared", path: "gateway.ts" }], ALL_RUN);
assert(!ifaceDeclared.failed.includes("G7"), "declared dispatch passes G7");
console.log("gates.test (fixtures): all passed");
