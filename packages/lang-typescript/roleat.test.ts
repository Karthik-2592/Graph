// Run: node packages/lang-typescript/roleat.test.ts
import { Project } from "ts-morph";
import { roleAt, refineScopes } from "./roleat.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
const project = new Project({ useInMemoryFileSystem: true });
const sf = project.createSourceFile("test.tsx", `
import { x } from "./x";
export class C {
  get = () => { helper(); };
  val = compute();
  method() { helper(); }
}
export function helper() {}
export const el = <div><Comp /></div>;
`);
const lines = sf.getFullText().split("\n");
const findCol = (substr: string) => { for (let i = 0; i < lines.length; i++) { const c = lines[i].indexOf(substr); if (c >= 0) return [i, c] as const; } throw new Error(substr); };
const [l1, c1] = findCol("helper();"); assert(roleAt(sf, l1, c1) === "call", "helper() is a call");
const [l2, c2] = findCol("Comp"); assert(roleAt(sf, l2, c2) === "jsx", "JSX tag is jsx");
const spans = refineScopes(sf, "test.tsx");
assert(spans.some((s) => s.kind === "property-function" && s.nodeId.includes("get")), "arrow property span");
assert(spans.some((s) => s.kind === "module-init"), "module-init span");
console.log("roleat.test: all passed");
