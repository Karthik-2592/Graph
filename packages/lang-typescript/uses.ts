// C6: uses / extends / implements / external nodes.
// `uses` = resolved defining file through barrels/inferred types;
// `extends`/`implements` from relationships; one external node per package.
import type { NodeRow, EdgeRow } from "../core/store.ts";
import { symbolId } from "../core/ids.ts";

export function usesEdges(definingFile: Map<string, string>, file: string): EdgeRow[] {
  const edges: EdgeRow[] = [];
  for (const [sym, defFile] of definingFile) edges.push({ src: `${file}::`, dst: `${defFile}::`, kind: "uses", provenance: "scip", attrs: { via: "inferred-type" } });
  return edges;
}

export function typeRelationEdges(classId: string, baseId: string, kind: "extends" | "implements"): EdgeRow[] {
  return [{ src: classId, dst: baseId, kind, provenance: "scip" }];
}

export function externalNodes(packages: Map<string, string>): NodeRow[] {
  // One external node per package (D11); imports producer supplies them
  // when dependencies are absent.
  return [...packages.entries()].map(([pkg, file]) => ({ id: symbolId(file, `external:${pkg}`), kind: "external", name: pkg, file_id: file, attrs: { package: pkg } }));
}
