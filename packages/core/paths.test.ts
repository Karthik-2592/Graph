// Run: node packages/core/paths.test.ts
import { toPosix, normalizeRepoPath } from "./paths.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
assert(toPosix(String.raw`backend\src\a.ts`) === "backend/src/a.ts", "backslash to posix");
assert(normalizeRepoPath("./x.ts") === "x.ts", "leading ./ stripped");
assert(toPosix("a/b.ts") === "a/b.ts", "posix unchanged");
console.log("paths.test: all passed");
