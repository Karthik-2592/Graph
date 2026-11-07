// Python symbols (plan §6): tree-sitter roleAt/refineScopes interface,
// scip-python symbol shapes. Mirrors lang-typescript/symbols.ts.
export function parse(symbol: string): { file: string; descriptor: string } | null {
  const m = symbol.match(/`([^`]*\.py)`[\\/\\\\](.*)$/);
  return m ? { file: m[1].split("\\").join("/"), descriptor: m[2] } : null;
}
export function normalize(descriptor: string): string {
  return descriptor.replace(/<init>\(self(,.*)?\)\./, "").replace(/\((self|[^)]*)\)(?=\.|$)/g, "()");
}
export function isNoise(symbol: string): boolean { return /site-packages|lib\/python|typeshed/i.test(symbol) && !symbol.includes("src/"); }
export type Role = "call" | "new" | "jsx" | "decorator" | "reference" | "type";
export const pythonPlugin = { id: "python" as const, detect: (_root: string) => [{ root: _root }], indexer: { command: (_p: unknown, _out: string) => ["scip-python", "index"], requiresInstalledDeps: true } };
