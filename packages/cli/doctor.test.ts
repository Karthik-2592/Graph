// Run: node packages/cli/doctor.test.ts
import { doctor, doctorReport } from "./doctor.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
const checks = doctor(".");
assert(checks.length === 4, "four checks");
assert(checks[0].name.startsWith("node"), "node check first");
assert(typeof doctorReport(".") === "string" && doctorReport(".").includes("node"), "report renders");
console.log("doctor.test: all passed\n" + doctorReport("."));
