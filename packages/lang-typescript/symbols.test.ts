// Run: node packages/lang-typescript/symbols.test.ts
import { parse, normalize, isNoise } from "./symbols.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
const p = parse("scip-typescript npm backend 1.0.0 `src/services/userService.ts`/UserService#findById().");
assert(p?.file === "src/services/userService.ts" && p.descriptor === "UserService#findById().", "parse basic");
const ctor = parse("scip-typescript npm graph 0.1.0 `app/page.tsx`/Foo#`<constructor>`().");
assert(ctor !== null && normalize(ctor.descriptor) === "Foo#", "constructor maps onto class");
assert(parse("local 123") === null, "locals rejected");
assert(isNoise("scip-typescript npm typescript `lib.es5.d.ts`/x"), "lib symbols are noise");
console.log("symbols.test: all passed");
