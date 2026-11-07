// Run: node packages/extractors/extractors.test.ts
import { extractEvents, extractContract } from "./index.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
const ev = extractEvents([
  { file: "a.ts", line: 1, target: "x::Bus#emit().", literalName: "orderPlaced", enclosing: "a.ts::place()." },
  { file: "b.ts", line: 2, target: "x::Bus#on().", literalName: "orderPlaced", enclosing: "b.ts::sendReceipt()." },
  { file: "a.ts", line: 3, target: "x::Bus#emit().", literalName: null, enclosing: "a.ts::replay()." },
]);
assert(ev.edges.length === 2 && ev.sites.length === 1, "events: 2 edges + 1 site");
const ct = extractContract(
  [{ routeSymbol: "routes.getUser", enclosing: "c.ts::getUserViaContract()." }],
  [{ routeSymbol: "routes.getUser", handler: "u.ts::UserController#get." }],
);
assert(ct.edges.length === 2 && ct.nodes.length === 1, "contract: requests + serves via route node");
console.log("extractors.test: all passed");
