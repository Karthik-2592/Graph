// Ground-truth scorer (port of graph-experiments/scripts/evaluate.py +
// dyn.py). Pure: extracted edges in, per-kind precision/recall out.
// Usage: node fixtures/scorer.ts fixtures/truth/shop.json <extracted.json>
// extracted.json: { "calls": [[src,dst],...], "renders": [...],
//   "dynamic": { "events": [...], "tables": [...], "frontendToBackend": [...] } }
// Exits non-zero on any false edge, and reports missed edges.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type EdgePair = [string, string];
export type Truth = { calls: EdgePair[]; renders: EdgePair[]; dynamic?: Record<string, EdgePair[]> };
export type Extracted = Partial<{ calls: EdgePair[]; renders: EdgePair[]; dynamic: Record<string, EdgePair[]> }>;

const key = (e: EdgePair) => `${e[0]}\0${e[1]}`;
const toSet = (edges: EdgePair[]) => new Set(edges.map(key));
const fromSet = (s: Set<string>) => [...s].map((k) => k.split("\0") as EdgePair).sort((a, b) => a.join("\0").localeCompare(b.join("\0")));

export type KindScore = { truth: number; found: number; missed: EdgePair[]; extra: EdgePair[]; precision: number; recall: number };

export function scoreKind(truth: EdgePair[], extracted: EdgePair[]): KindScore {
  const t = toSet(truth), x = toSet(extracted);
  const tp = [...t].filter((k) => x.has(k)).length;
  const missed = fromSet(new Set([...t].filter((k) => !x.has(k))));
  const extra = fromSet(new Set([...x].filter((k) => !t.has(k))));
  return {
    truth: t.size,
    found: tp,
    missed,
    extra,
    precision: x.size === 0 ? (t.size === 0 ? 1 : 0) : tp / x.size,
    recall: t.size === 0 ? 1 : tp / t.size,
  };
}

export function score(truth: Truth, extracted: Extracted): Record<string, KindScore> {
  const out: Record<string, KindScore> = {
    calls: scoreKind(truth.calls, extracted.calls ?? []),
    renders: scoreKind(truth.renders, extracted.renders ?? []),
  };
  for (const [kind, pairs] of Object.entries(truth.dynamic ?? {})) {
    out[`dynamic.${kind}`] = scoreKind(pairs, extracted.dynamic?.[kind] ?? []);
  }
  return out;
}

export function formatReport(scores: Record<string, KindScore>): string {
  const lines: string[] = [];
  let ok = true;
  for (const [kind, s] of Object.entries(scores)) {
    lines.push(`${kind}: recall ${s.found}/${s.truth} (${(s.recall * 100).toFixed(1)}%) precision ${(s.precision * 100).toFixed(1)}% extra ${s.extra.length} missed ${s.missed.length}`);
    for (const [a, b] of s.missed) lines.push(`  MISSED ${a} -> ${b}`);
    for (const [a, b] of s.extra) lines.push(`  EXTRA  ${a} -> ${b}`);
    if (s.extra.length > 0) ok = false;
  }
  lines.push(ok ? "OK: 0 false edges" : "FAIL: false edges present");
  return lines.join("\n");
}

function main() {
  const [truthPath, extractedPath] = process.argv.slice(2);
  if (!truthPath || !extractedPath) {
    console.error("usage: node fixtures/scorer.ts <truth.json> <extracted.json>");
    process.exit(2);
  }
  const truth = JSON.parse(readFileSync(truthPath, "utf8")) as Truth;
  const extracted = JSON.parse(readFileSync(extractedPath, "utf8")) as Extracted;
  const scores = score(truth, extracted);
  console.log(formatReport(scores));
  const hasFalse = Object.values(scores).some((s) => s.extra.length > 0);
  process.exit(hasFalse ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
