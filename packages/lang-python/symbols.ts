// Python symbols from REAL scip-python output (F2 fix).
// scip-python names symbols by module, not file:
//   `requests.api`/request().  →  module `requests.api`, descriptor `request().`
// Old parse() expected file paths and never matched real symbols,
// which is why the Python runner yielded 0 function nodes (F5).
export function parse(symbol: string): { file: string; descriptor: string } | null {
  // `` `module.path`/descriptor `` — module is dot-separated, not a path.
  const m = symbol.match(/`([^`]+)`\/(.*)$/);
  if (!m) return null;
  const moduleName = m[1];
  // Convert module to a repo-relative path the indexer used: requests.api -> requests/api.py
  const file = `${moduleName.replace(/\./g, "/")}.py`;
  return { file, descriptor: m[2] };
}
export function normalize(descriptor: string): string {
  // `Session#send(self, data).` -> `Session#send().`; strip trailing params.
  let d = descriptor.replace(/\(([^()]*)\)(?=\.)/g, (m) => (m === "()" ? m : "()"));
  d = d.replace(/\([^()]*\)$/, "");
  return d;
}
export function isNoise(symbol: string): boolean { return /site-packages|stdlib|typeshed/i.test(symbol); }
export function isExternal(symbol: string): boolean { return /site-packages|stdlib/i.test(symbol); }
export type Role = "call" | "new" | "jsx" | "decorator" | "reference" | "type";
export const pythonPlugin = { id: "python" as const, detect: (_root: string) => [{ root: _root }], indexer: { command: (_p: unknown, _out: string) => ["scip-python", "index"], requiresInstalledDeps: true } };
