// Stable IDs (plan §4.2): <repo-relative-file>::<scip-descriptor>
export function fileId(file: string): string { return `${file}::`; }
export function moduleInitId(file: string): string { return `${file}::<module-init>`; }
export function symbolId(file: string, descriptor: string): string { return `${file}::${descriptor}`; }
export function splitId(id: string): { file: string; descriptor: string } {
  const i = id.indexOf("::");
  return i === -1 ? { file: id, descriptor: "" } : { file: id.slice(0, i), descriptor: id.slice(i + 2) };
}
