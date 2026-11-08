// C4: node kinds + parents from the index (SymbolInformation.kind),
// not the capital-letter heuristic. Kind enum (scip.proto):
// Class 7, Interface 21, Method 26, Function 17, AbstractMethod 66, …
export const KIND_MAP: Record<number, string> = {
  7: "class", 21: "interface", 26: "method", 17: "function", 66: "method", 9: "class",
};

export function kindOf(kind: number | undefined, descriptor: string): string {
  if (kind !== undefined && KIND_MAP[kind]) return KIND_MAP[kind];
  // Fallback: descriptor-chain parent (class → method), components are
  // function nodes with attrs.component (never "class").
  if (descriptor.includes("#")) return descriptor.endsWith("#") ? "class" : "method";
  return "function";
}

/** Parent from the descriptor chain: `K#m().` → `K#`. */
export function parentOf(descriptor: string): string | null {
  const i = descriptor.indexOf("#");
  return i === -1 ? null : descriptor.slice(0, i + 1);
}
