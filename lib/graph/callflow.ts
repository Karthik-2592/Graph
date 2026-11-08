// G3: call-flow mode (file-level, complements the Flow tab).
// Entry points from config/routes/events; path between two nodes; depth control.
import { adjacency, reach, type Direction } from "./reach.ts";
import type { Edge } from "../parser/types.ts";

export function entryPointsFromRoutes(routes: { file: string }[]): string[] {
  return [...new Set(routes.map((r) => r.file))].sort();
}
export function callFlow(edges: Edge[], entry: string, depth = 2, direction: Direction = "dependencies") {
  return reach(adjacency(edges), entry, direction, depth);
}
export function pathBetween(edges: Edge[], from: string, to: string, maxDepth = 8): string[] | null {
  const graph = adjacency(edges);
  // BFS shortest path
  const prev = new Map<string, string>([[from, ""]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === to) break;
    for (const next of graph.imports.get(cur) ?? []) {
      if (!prev.has(next)) { prev.set(next, cur); queue.push(next); }
    }
  }
  if (!prev.has(to)) return null;
  const path: string[] = [];
  for (let cur = to; cur; cur = prev.get(cur)!) { path.unshift(cur); if (cur === from) break; }
  return path.length <= maxDepth + 1 ? path : null;
}
