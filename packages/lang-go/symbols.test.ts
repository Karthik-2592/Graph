// Run: node packages/lang-go/symbols.test.ts
import { parse, normalize } from "./symbols.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
const p = parse("scip-go go example `main.go`/main#");
assert(p?.file === "main.go", "go parse");
assert(normalize("Foo#(x int)") === "Foo#", "go normalize");
console.log("go symbols.test: all passed");
