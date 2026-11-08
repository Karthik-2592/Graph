// Run: node packages/lang-python/symbols.test.ts
import { parse, normalize } from "./symbols.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
// Real scip-python shapes (module, not file):
const p = parse("scip-python pip requests 2.0 `requests.api`/request().");
assert(p?.file === "requests/api.py" && p.descriptor === "request().", `module parse: ${JSON.stringify(p)}`);
const s = parse("scip-python pip requests 2.0 `requests.models`/PreparedRequest#send().");
assert(s?.file === "requests/models.py", "class parse");
assert(normalize("Session#send(self, data).") === "Session#send().", "self stripped");
console.log("python symbols.test: all passed");
