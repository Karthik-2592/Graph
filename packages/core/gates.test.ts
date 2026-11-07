// Run: node packages/core/gates.test.ts
import { openDb, migrate } from "./db.ts";
import { createRun, insertSites, transaction } from "./store.ts";
import { checkGates, coverageReport } from "./gates.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
const db = openDb(":memory:"); migrate(db);
const run = createRun(db, { root: "x" });
transaction(db, () => insertSites(db, run, [
  { kind: "unresolved-import", status: "unrecognized", path: "a.ts", line: 1 },
  { kind: "event-emit", status: "unrecognized", path: "b.ts", line: 2 },
  { kind: "event-emit", status: "recognized", path: "b.ts", line: 3 },
]));
const lenient = checkGates(db, run, {});
assert(lenient.failed.length === 0, "lenient never fails");
const strict = checkGates(db, run, { strict: true });
assert(strict.failed.includes("G2") && strict.failed.includes("G6"), `strict fails G2+G6, got ${strict.failed}`);
assert(!strict.failed.includes("G1"), "G1 passes (no outside-program sites)");
const report = coverageReport(db, run);
assert(report.byStatus.unrecognized === 2 && report.byKind["event-emit"] === 2, "coverage report counts");
console.log("gates.test: all passed");
