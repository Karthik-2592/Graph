// Run: node packages/lang-typescript/ingest.test.ts [index.scip]
import { ingestScip } from "./ingest.ts";
import { score, type Truth } from "../../fixtures/scorer.ts";
import { readFileSync } from "node:fs";

const file = process.argv[2] ?? `${process.env.TEMP}\\graph-spike.scip`;
const { nodes, edges, documents } = ingestScip(file);
const truth = JSON.parse(readFileSync(new URL("../../fixtures/truth/shop.json", import.meta.url), "utf8")) as Truth;
const calls = edges.filter((e) => e.kind === "calls").map((e) => [e.src, e.dst] as [string, string]);
const renders = edges.filter((e) => e.kind === "renders").map((e) => [e.src, e.dst] as [string, string]);
const s = score(truth, { calls, renders });
console.log(`documents=${documents} nodes=${nodes.length} edges=${edges.length} calls=${calls.length} renders=${renders.length}`);
console.log("calls recall", `${s.calls.found}/${s.calls.truth}`, "extra", s.calls.extra.length);
console.log("renders recall", `${s.renders.found}/${s.renders.truth}`, "extra", s.renders.extra.length);
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
assert(nodes.length > 0 && edges.length > 0, "ingestion produced graph");
console.log("ingest.test: done (see recall above; 34/34 + 5/5 is Task 07 exit)");
