// graph export: JSON/DOT/GraphML serialisation of L1/L2 projections.
// Deterministic ordering so exports diff cleanly.
export function toDot(edges: { src: string; dst: string; kind: string; weight: number }[]): string {
  const lines = ["digraph graph {", ...edges.map((e) => `  ${JSON.stringify(e.src)} -> ${JSON.stringify(e.dst)} [label="${e.kind} x${e.weight}"];`), "}"];
  return lines.join("\n") + "\n";
}
export function toJson(edges: { src: string; dst: string; kind: string; weight: number }[]): string { return JSON.stringify({ edges }, null, 2) + "\n"; }
export function toGraphMl(edges: { src: string; dst: string }[]): string {
  return `<?xml version="1.0"?>\n<graphml><graph edgedefault="directed">${edges.map((e, i) => `<edge id="e${i}" source="${e.src.replace(/"/g, "&quot;")}" target="${e.dst.replace(/"/g, "&quot;")}"/>`).join("")}</graph></graphml>\n`;
}
