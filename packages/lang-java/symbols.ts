// Java/Kotlin pack (U4): build must succeed — runner shells to Maven/Gradle
// first, then scip-java. Symbols carry package paths.
export function parse(symbol: string): { file: string; descriptor: string } | null {
  const m = symbol.match(/`([^`]*\.(?:java|kt))`[\\/\\\\](.*)$/);
  return m ? { file: m[1].split("\\").join("/"), descriptor: m[2] } : null;
}
export function normalize(d: string): string { return d; }
export function isNoise(s: string): boolean { return /jdk|kotlin-stdlib/.test(s); }
export const javaPlugin = { id: "java" as const, detect: (_r: string) => [{ root: _r }], indexer: { command: (_p: unknown, _o: string) => ["scip-java", "index"], requiresInstalledDeps: true } };
