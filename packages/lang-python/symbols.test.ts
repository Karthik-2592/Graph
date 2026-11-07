// Run: node packages/lang-python/symbols.test.ts
import { parse, normalize } from "./symbols.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
const p = parse("scip-python pip requests 2.0 `src/session.py`/Session#send().");
assert(p?.file === "src/session.py", "python parse");
assert(normalize("Session#send(self, data).") === "Session#send().", "self stripped");
console.log("python symbols.test: all passed");
