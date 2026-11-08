// Run: node packages/core/cache.test.ts
import { cacheKey, treeHashOf } from "./cache.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
const a = cacheKey("/r", "h1", "p1", { scip: "0.6.1" });
assert(a === cacheKey("/r", "h1", "p1", { scip: "0.6.1" }), "stable");
assert(a !== cacheKey("/r", "h2", "p1", { scip: "0.6.1" }), "tree hash changes key");
assert(treeHashOf([{ path: "b", hash: "1" }, { path: "a", hash: "2" }]) === treeHashOf([{ path: "a", hash: "2" }, { path: "b", hash: "1" }]), "order-independent");
console.log("cache.test: all passed");
