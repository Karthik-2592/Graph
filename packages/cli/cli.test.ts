// Run: node packages/cli/cli.test.ts
import { main } from "./index.ts";
import { toDot, toJson, toGraphMl } from "./export.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
assert(main(["--help"]) === 0, "help ok");
assert(main(["bogus"]) === 2, "unknown command rejected");
assert(main(["check"]) === 1, "unimplemented subcommand exits non-zero");
const edges = [{ src: "a", dst: "b", kind: "imports", weight: 2 }];
assert(toDot(edges).includes('"a" -> "b"'), "dot export");
assert(JSON.parse(toJson(edges)).edges.length === 1, "json export");
assert(toGraphMl(edges).includes("<edge"), "graphml export");
console.log("cli.test: all passed");
