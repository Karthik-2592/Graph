// B4: graph discrepancy — SCIP vs import-derived file edges by cause.
export function discrepancyCli(scipEdges: { src: string; dst: string }[], importEdges: { src: string; dst: string }[]): string {
  const key = (e: { src: string; dst: string }) => `${e.src}>${e.dst}`;
  const scip = new Set(scipEdges.map(key)), imp = new Set(importEdges.map(key));
  const lines: string[] = [];
  for (const k of scip) if (!imp.has(k)) lines.push(`barrel/inferred-type: ${k}`);
  for (const k of imp) if (!scip.has(k)) lines.push(`missing: ${k}`);
  return lines.join("\n") || "no discrepancies";
}
