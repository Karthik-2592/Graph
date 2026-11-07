// Spike S1: read SCIP via generated protobuf bindings (vs `scip print --json`).
// Run: node spike-s1.ts <index.scip>
import { readFileSync } from "node:fs";
import { fromBinary } from "@bufbuild/protobuf";
import { IndexSchema } from "@scip-code/scip";

const file = process.argv[2] ?? `${process.env.TEMP}\\graph-spike.scip`;
const bytes = readFileSync(file);
const t0 = performance.now();
const index = fromBinary(IndexSchema, bytes);
const t1 = performance.now();
const docs = index.documents;
let defs = 0, occs = 0, withEncl = 0;
for (const d of docs) for (const o of d.occurrences) {
  occs++;
  if (o.symbolRoles & 1) defs++;
  if (o.enclosingRange) withEncl++;
}
console.log(JSON.stringify({
  file, bytes: bytes.length, parseMs: Math.round(t1 - t0),
  documents: docs.length, occurrences: occs,
  definitions: defs, withEnclosingRange: withEncl,
  descriptor: docs[0]?.occurrences[0]?.symbol ?? null,
}));
