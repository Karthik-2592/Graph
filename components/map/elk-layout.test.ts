// Run: node components/map/elk-layout.test.ts
import { layoutElk } from "./elk-layout.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
const objects = [
  { id: "a", dir: "a", label: "a", fileCount: 1, fanIn: 0, fanOut: 1, kind: "folded" as const },
  { id: "b", dir: "b", label: "b", fileCount: 1, fanIn: 1, fanOut: 0, kind: "folded" as const },
];
const boxes = await layoutElk(objects, [{ id: "e1", source: "a", target: "b", sourceHandle: null, targetHandle: null, count: 1 }]);
assert(boxes.has("a") && boxes.has("b"), "both nodes laid out");
const a = boxes.get("a")!, b = boxes.get("b")!;
assert(Number.isFinite(a.x) && Number.isFinite(b.x), "positions are finite");
assert(b.x >= a.x, "RIGHT direction: target right of source");
console.log("elk-layout.test: all passed", JSON.stringify([...boxes.values()]));
