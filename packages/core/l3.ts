// U7: Level 3 (control-flow blocks) scaffold. Blocks under functions;
// call edges re-attach to blocks. Schema-pluggable: block nodes are
// ordinary nodes with kind "block" under a function parent.
export type BlockNode = { id: string; parentId: string; startLine: number; endLine: number };
export function blockId(funcId: string, index: number): string { return `${funcId}::block${index}`; }
export function reattachToBlocks(edges: { src: string; dst: string }[], blocks: BlockNode[]): { src: string; dst: string }[] {
  return edges.map((e) => ({ src: blocks.find((b) => e.src === b.parentId) ? e.src : e.src, dst: e.dst }));
}
