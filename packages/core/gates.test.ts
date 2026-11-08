// Run: node packages/core/gates.test.ts
import { openDb, migrate } from "./db.ts";
import { createRun, insertSites, transaction } from "./store.ts";
import { checkGates, coverageReport, recordProducers } from "./gates.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
const db = openDb(":memory:"); migrate(db);
const run = createRun(db, { root: "x" });
transaction(db, () => insertSites(db, run, [
  { kind: "unresolved-import", status: "unrecognized", path: "a.ts", line: 1 },
  { kind: "event-emit", status: "unrecognized", path: "b.ts", line: 2 },
]));
// Imports-only run: G2 evaluated, rest not-evaluated.
recordProducers(db, run, { "ts-imports": "ran", scip: "skipped", extractors: "skipped", profile: "skipped", declarations: "skipped", walk: "skipped" });
const lenient = checkGates(db, run, {});
assert(lenient.failed.length === 0, "lenient never fails");
assert(lenient.unevaluated.includes("G4") && lenient.unevaluated.includes("G1"), "G1/G4 not-evaluated");
assert(!lenient.unevaluated.includes("G2"), "G2 evaluated");
const strict = checkGates(db, run, { strict: true });
assert(strict.failed.includes("G2"), "strict fails G2 (unresolved site)");
assert(strict.failed.includes("G4"), "strict fails not-evaluated G4");
assert(strict.unevaluated.includes("G4"), "G4 listed unevaluated");
const allowed = checkGates(db, run, { strict: true, allowUnevaluated: true });
assert(!allowed.failed.includes("G4") && allowed.failed.includes("G2"), "--allow-unevaluated excuses G4 only");
const report = coverageReport(db, run);
assert(report.byStatus.unrecognized === 2, "coverage report");
console.log("gates.test: all passed");
