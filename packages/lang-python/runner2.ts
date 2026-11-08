// F6: Python runner through the F1 shared core (ingestIndex).
// Function-level callers via enclosing ranges; roleAt/refineScopes from WASM.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fromBinary } from "@bufbuild/protobuf";
import { IndexSchema } from "@scip-code/scip";
import { ingestIndex, type Plugin } from "../core/ingest-core.ts";
import { parse as pyParse, normalize as pyNormalize } from "./symbols.ts";

export const pythonCorePlugin: Plugin = {
  id: "python",
  parse: pyParse,
  normalize: pyNormalize,
  kindOf: (d) => (d.includes("#") ? "method" : "function"),
  isNoise: () => false,
  isExternal: () => false,
};

export function runPythonCore(root: string, out: string) {
  execFileSync("scip-python", ["index", "--cwd", root, "--output", out], { stdio: "pipe" });
  const index = fromBinary(IndexSchema, readFileSync(out));
  const docs = index.documents.map((d) => ({
    relativePath: d.relativePath,
    occurrences: d.occurrences.map((o) => ({ symbol: o.symbol, symbolRoles: o.symbolRoles, range: o.range, enclosingRange: o.enclosingRange })),
  }));
  return ingestIndex(docs, pythonCorePlugin);
}
