// ELK layered layout for the canvas (Task 12 decision: ELK wins at scale).
// Dagre stays the instant synchronous fallback; ELK upgrades the layout
// asynchronously. Sizes come from layout.ts so the box drawn is the box laid out.
import type { MapEdge, MapObject } from "@/lib/graph/view";
import { sizeOf, type Box } from "./layout.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElkInstance = any;

async function getElk(): Promise<ElkInstance> {
  const { default: Elk } = await import("elkjs");
  return new Elk({ layered: { considerModelOrder: "PREFER_EDGE_LENGTH" } });
}

export async function layoutElk(objects: readonly MapObject[], edges: readonly MapEdge[], timeoutMs = 30000): Promise<Map<string, Box>> {
  const elk = await getElk();
  const seen = new Set<string>();
  const elkEdges: { id: string; sources: string[]; targets: string[] }[] = [];
  for (const e of edges) {
    const key = `${e.source}>${e.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    elkEdges.push({ id: `e${elkEdges.length}`, sources: [e.source], targets: [e.target] });
  }
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.crossingMinimization.sifting.maxIterations": "5",
      "elk.spacing.nodeNode": "16",
      "elk.spacing.nodeNodeBetweenLayers": "72",
    },
    children: objects.map((o) => ({ id: o.id, width: sizeOf(o).width, height: sizeOf(o).height })),
    edges: elkEdges,
  };
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("ELK layout timed out")), timeoutMs));
  const result = await Promise.race([elk.layout(graph), timeout]);
  const boxes = new Map<string, Box>();
  for (const child of result.children ?? []) {
    boxes.set(child.id, { x: child.x ?? 0, y: child.y ?? 0, width: child.width ?? 0, height: child.height ?? 0 });
  }
  return boxes;
}
