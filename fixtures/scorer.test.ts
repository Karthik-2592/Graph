// Run: node fixtures/scorer.test.ts
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { score, formatReport, type Truth, type Extracted } from "./scorer.ts";

const truth = JSON.parse(readFileSync(new URL("./truth/shop.json", import.meta.url), "utf8")) as Truth;

function assert(cond: boolean, msg: string) { if (!cond) { console.error("FAIL:", msg); process.exit(1); } }

// 1. Perfect extraction => 100% everywhere, 0 false edges
const perfect: Extracted = { calls: truth.calls, renders: truth.renders, instantiates: truth.instantiates ?? [], dynamic: truth.dynamic };
const ok = score(truth, perfect);
for (const [k, s] of Object.entries(ok)) assert(s.precision === 1 && s.recall === 1 && s.extra.length === 0, `${k} perfect score`);
console.log("perfect:", formatReport(ok));

// 2. Missing one call => recall < 1, no false edges
const missing: Extracted = { ...perfect, calls: truth.calls.slice(1) };
const m = score(truth, missing);
assert(m.calls.recall < 1 && m.calls.missed.length === 1, "missing call detected");
assert(m.calls.extra.length === 0, "no false edges in missing case");

// 3. One extra edge => precision < 1, detected
const extra: Extracted = { ...perfect, calls: [...truth.calls, ["x.ts::", "y.ts::"]] };
const e = score(truth, extra);
assert(e.calls.extra.length === 1 && e.calls.precision < 1, "extra edge detected");

// 4. CLI end-to-end via temp files
const dir = mkdtempSync(path.join(tmpdir(), "graph-scorer-"));
const tf = path.join(dir, "truth.json"), ef = path.join(dir, "extracted.json");
writeFileSync(tf, JSON.stringify(truth)); writeFileSync(ef, JSON.stringify(perfect));
console.log("all scorer tests passed");
