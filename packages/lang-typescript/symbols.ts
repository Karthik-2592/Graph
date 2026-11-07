// All indexer-specific symbol shapes live here (plan §6, §12 risk).
// Descriptor examples: constructors as `Class#\`<constructor>\`().`,
// object-literal members as `getUser0:`.

export function parse(symbol: string): { file: string; descriptor: string } | null {
  const m = symbol.match(/`([^`]*\.(?:tsx?|jsx?|mts|cts|mjs|cjs))`[\\/\\\\](.*)$/);
  return m ? { file: m[1].split("\\").join("/"), descriptor: m[2].split("\\").join("/") } : null;
}
export function normalize(descriptor: string): string {
  // Strip constructor marker, then strip parameter lists: `NotFound#(id)` -> `NotFound#`,
  // `findById().` stays `findById().`, `isAuthed().(req)` -> `isAuthed().`
  let d = descriptor.replace("`<constructor>`().", "").replace("`<constructor>`", "");
  d = d.replace(/\([^()]*\)(?=\.|$)/g, "()");
  return d;
}
export function isExternal(symbol: string): boolean {
  return /node_modules|npm\/|external/i.test(symbol) || symbol.includes("`node_modules");
}
export function isNoise(symbol: string): boolean {
  return /lib\.(?:es|dom)|typescript\.d\.ts|@types\//i.test(symbol) && !symbol.includes("src/");
}
export function isLocal(symbol: string): boolean { return symbol.startsWith("local"); }

export type Role = "call" | "new" | "jsx" | "decorator" | "reference" | "type";
/** Stub replaced by Task 07's ts-morph implementation; default classification. */
export function roleAtStem(_line: string, _col: number): Role { return "call"; }
