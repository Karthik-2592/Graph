// Run: node lib/graph/hierarchy.test.ts
import { buildHierarchy } from "./hierarchy.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
const h = buildHierarchy(["backend/src/a.ts", "backend/src/b.ts", "frontend/src/c.ts", "root.ts"]);
assert(h.dir === "." && h.files.includes("root.ts"), "root keeps its own file");
assert(h.children.some((c) => c.dir === "backend"), "backend group, not folded into root");
assert(h.children.some((c) => c.dir === "frontend"), "frontend group");
const backend = h.children.find((c) => c.dir === "backend")!;
assert(backend.files.length === 2, "directory's own files stay with it");
console.log("hierarchy.test: all passed");
