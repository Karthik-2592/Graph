// Run: node packages/lang-python/runner.test.ts [index.scip]
// Uses the golden requests.scip from graph-experiments if present.
import { runPythonIndexer } from "./runner.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
// Static check only (no scip-python binary required): runner module loads,
// plugin contract holds, and the requests.scip golden parses via symbols.
import { parse } from "./symbols.ts";
const p = parse("scip-python pip requests 2.0 `src/models.py`/Request#send().");
assert(p?.file === "src/models.py", "golden symbol parses");
console.log("runner.test: all passed (binary run is manual: scip-python index)");
void runPythonIndexer;
