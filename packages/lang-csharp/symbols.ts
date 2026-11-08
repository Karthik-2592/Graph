// C# pack (U4): scip-dotnet symbols; needs compile_commands.json for C/C++ later.
export function parse(symbol: string): { file: string; descriptor: string } | null {
  const m = symbol.match(/`([^`]*\.cs)`[\\/\\\\](.*)$/);
  return m ? { file: m[1].split("\\").join("/"), descriptor: m[2] } : null;
}
export function normalize(d: string): string { return d; }
export function isNoise(s: string): boolean { return /mscorlib|System\./.test(s); }
export const csharpPlugin = { id: "csharp" as const, detect: (_r: string) => [{ root: _r }], indexer: { command: (_p: unknown, _o: string) => ["scip-dotnet", "index"], requiresInstalledDeps: true } };
