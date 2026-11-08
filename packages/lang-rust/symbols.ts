// Rust pack (U4): symbols + runner, same F1 core shape as Go.
export function parse(symbol: string): { file: string; descriptor: string } | null {
  const m = symbol.match(/`([^`]*\.rs)`[\\/\\\\](.*)$/);
  return m ? { file: m[1].split("\\").join("/"), descriptor: m[2] } : null;
}
export function normalize(d: string): string { return d.replace(/\([^()]*\)(?=\.)/g, (m) => (m === "()" ? m : "()")).replace(/\([^()]*\)$/, ""); }
export function isNoise(s: string): boolean { return /registry\/rustc|core\//.test(s); }
export const rustPlugin = { id: "rust" as const, detect: (_r: string) => [{ root: _r }], indexer: { command: (_p: unknown, _o: string) => ["scip-rust", "index"], requiresInstalledDeps: false } };
