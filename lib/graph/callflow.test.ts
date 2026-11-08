// Run: node lib/graph/callflow.test.ts
import { callFlow, pathBetween, entryPointsFromRoutes } from "./callflow.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
const edges = [
  { source: "a", target: "b", kind: "import" as const, typeOnly: false, specifier: "./b", line: 1 },
  { source: "b", target: "c", kind: "import" as const, typeOnly: false, specifier: "./c", line: 1 },
];
assert(entryPointsFromRoutes([{ file: "r" }]).includes("r"), "entry points");
const flow = callFlow(edges, "a", 2);
assert(flow.steps[0].includes("b") && flow.steps[1].includes("c"), "call flow depth 2");
assert(JSON.stringify(pathBetween(edges, "a", "c")) === JSON.stringify(["a", "b", "c"]), "path a->c");
console.log("callflow.test: all passed");
