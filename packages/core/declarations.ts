// Declarations (plan §8.4): explicit polymorphic dispatch + escape hatches.
import type { Db } from "./db.ts";
import type { EdgeRow } from "./store.ts";

export type Declaration = { from: string; to: string[]; kind: string; note?: string };

export function loadDeclarations(text: string): Declaration[] {
  const raw = JSON.parse(text);
  if (raw.version !== 1 || !Array.isArray(raw.edges)) throw new Error("graph.declarations.json: expected { version: 1, edges: [...] }");
  return raw.edges.map((e: { from: string; to: string[]; kind: string; note?: string }) => ({ from: e.from, to: e.to, kind: e.kind, note: e.note }));
}

export function declaredEdges(db: Db, runId: number, decls: Declaration[]): { edges: EdgeRow[]; stale: Declaration[] } {
  const exists = (id: string) => (db.prepare("SELECT 1 AS x FROM nodes WHERE run_id=? AND id=?").get(runId, id) as { x: number } | undefined) !== undefined;
  const edges: EdgeRow[] = [], stale: Declaration[] = [];
  for (const d of decls) {
    if (!exists(d.from) || d.to.some((t) => !exists(t))) { stale.push(d); continue; }
    for (const t of d.to) edges.push({ src: d.from, dst: t, kind: d.kind, provenance: "declared", may: 1, attrs: { note: d.note ?? null } });
  }
  return { edges, stale };
}

/** Handler tables: const object literal of functions + table[key](…) dispatch. */
export function expandHandlerTable(members: string[], dispatchers: string[]): EdgeRow[] {
  const edges: EdgeRow[] = [];
  for (const d of dispatchers) for (const m of members) edges.push({ src: d, dst: m, kind: "calls", provenance: "ast" });
  return edges;
}
