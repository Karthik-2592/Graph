// Go plugin (Phase 7, easiest indexer): symbols + runner contract.
export function parse(symbol: string): { file: string; descriptor: string } | null {
  const m = symbol.match(/`([^`]*\.go)`[\\/\\\\](.*)$/);
  return m ? { file: m[1].split("\\").join("/"), descriptor: m[2] } : null;
}
export function normalize(descriptor: string): string {
  return descriptor.replace(/\(([^()]*)\)(?=\.|$)/g, (m) => (m === "()" ? m : "()")).replace(/\([^()]*\)$/, "");
}
export function isNoise(symbol: string): boolean { return /GOROOT|pkg\/mod/.test(symbol) && !symbol.includes("src/"); }
export const goPlugin = { id: "go" as const, detect: (_root: string) => [{ root: _root }], indexer: { command: (_p: unknown, _out: string) => ["scip-go", "index"], requiresInstalledDeps: false } };
