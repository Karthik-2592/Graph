// Hierarchical folding replacing fold.ts (Task 13): nested groups,
// per-subtree collapse/expand, no global group cap. A directory's own
// files stay with that directory.
export type HierarchyNode = { dir: string; files: string[]; children: HierarchyNode[] };

export function buildHierarchy(files: readonly string[]): HierarchyNode {
  const root: HierarchyNode = { dir: ".", files: [], children: [] };
  const byDir = new Map<string, HierarchyNode>([[".", root]]);
  const ensure = (dir: string): HierarchyNode => {
    if (byDir.has(dir)) return byDir.get(dir)!;
    const parentDir = dir.includes("/") ? dir.slice(0, dir.lastIndexOf("/")) : ".";
    const parent = ensure(parentDir);
    const node: HierarchyNode = { dir, files: [], children: [] };
    parent.children.push(node);
    byDir.set(dir, node);
    return node;
  };
  for (const f of files) {
    const dir = f.includes("/") ? f.slice(0, f.lastIndexOf("/")) : ".";
    ensure(dir).files.push(f);
  }
  const sort = (n: HierarchyNode) => { n.files.sort(); n.children.sort((a, b) => a.dir.localeCompare(b.dir)); n.children.forEach(sort); };
  sort(root);
  return root;
}

export type Level = "l1" | "l2";
export type EdgeStyle = { dashed: boolean; kind: string };
export function styleFor(provenance: string, may: number): EdgeStyle {
  return { dashed: may === 1 || provenance === "declared" || provenance === "heuristic", kind: provenance };
}
