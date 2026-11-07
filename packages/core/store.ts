// Normalized store: runs/nodes/edges/sites/coverage behind the Db interface.
import type { Db } from "./db.ts";
import { SCHEMA_VERSION } from "./schema.ts";

export type NodeRow = { id: string; kind: string; name: string; parent_id?: string|null; file_id?: string|null; package_id?: string|null; lang?: string|null; path?: string|null; start_line?: number|null; start_col?: number|null; end_line?: number|null; end_col?: number|null; role?: string|null; attrs?: Record<string, unknown>|null };
export type EdgeRow = { src: string; dst: string; kind: string; provenance: string; count?: number; resolved?: number; may?: number; attrs?: Record<string, unknown>|null };
export type SiteRow = { kind: string; status: string; node_id?: string|null; path?: string|null; line?: number|null; col?: number|null; reason?: string|null };

export function createRun(db: Db, opts: { root: string; commit_hash?: string|null; mode?: string; profile_hash?: string|null; tool_versions?: Record<string, unknown> }): number {
  const now = new Date().toISOString();
  const r = db.prepare("INSERT INTO runs (root, commit_hash, started_at, mode, profile_hash, tool_versions, schema_version) VALUES (?, ?, ?, ?, ?, ?, ?)").run(opts.root, opts.commit_hash ?? null, now, opts.mode ?? "lenient", opts.profile_hash ?? null, JSON.stringify(opts.tool_versions ?? {}), SCHEMA_VERSION);
  return Number((r as { lastInsertRowid?: number|bigint }).lastInsertRowid ?? 0);
}
export function upsertNodes(db: Db, runId: number, nodes: NodeRow[]): void {
  const st = db.prepare("INSERT INTO nodes (run_id,id,kind,name,parent_id,file_id,package_id,lang,path,start_line,start_col,end_line,end_col,role,attrs) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(run_id,id) DO UPDATE SET kind=excluded.kind,name=excluded.name,parent_id=excluded.parent_id,file_id=excluded.file_id,package_id=excluded.package_id,lang=excluded.lang,path=excluded.path,start_line=excluded.start_line,start_col=excluded.start_col,end_line=excluded.end_line,end_col=excluded.end_col,role=excluded.role,attrs=excluded.attrs");
  for (const n of nodes) st.run(runId, n.id, n.kind, n.name, n.parent_id ?? null, n.file_id ?? null, n.package_id ?? null, n.lang ?? null, n.path ?? null, n.start_line ?? null, n.start_col ?? null, n.end_line ?? null, n.end_col ?? null, n.role ?? null, n.attrs ? JSON.stringify(n.attrs) : null);
}
export function upsertEdges(db: Db, runId: number, edges: EdgeRow[]): void {
  const st = db.prepare("INSERT INTO edges (run_id,src,dst,kind,provenance,count,resolved,may,attrs) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(run_id,src,dst,kind,provenance) DO UPDATE SET count=excluded.count,resolved=excluded.resolved,may=excluded.may,attrs=excluded.attrs");
  for (const e of edges) st.run(runId, e.src, e.dst, e.kind, e.provenance, e.count ?? 1, e.resolved ?? 1, e.may ?? 0, e.attrs ? JSON.stringify(e.attrs) : null);
}
export function insertSites(db: Db, runId: number, sites: SiteRow[]): void {
  const st = db.prepare("INSERT INTO sites (run_id,kind,status,node_id,path,line,col,reason) VALUES (?,?,?,?,?,?,?,?)");
  for (const s of sites) st.run(runId, s.kind, s.status, s.node_id ?? null, s.path ?? null, s.line ?? null, s.col ?? null, s.reason ?? null);
}
export function setCoverage(db: Db, runId: number, kv: Record<string, string>): void {
  const st = db.prepare("INSERT INTO coverage (run_id,key,value) VALUES (?,?,?) ON CONFLICT(run_id,key) DO UPDATE SET value=excluded.value");
  for (const [k, v] of Object.entries(kv)) st.run(runId, k, v);
}
export function getRun(db: Db, runId: number): Record<string, unknown> | null {
  return (db.prepare("SELECT * FROM runs WHERE id = ?").get(runId) as Record<string, unknown>) ?? null;
}
export function listRuns(db: Db, limit = 50): Record<string, unknown>[] {
  return db.prepare("SELECT * FROM runs ORDER BY started_at DESC LIMIT ?").all(limit) as Record<string, unknown>[];
}
export function deleteRun(db: Db, runId: number): boolean {
  for (const t of ["edges", "nodes", "sites", "coverage"]) db.prepare(`DELETE FROM ${t} WHERE run_id = ?`).run(runId);
  return db.prepare("DELETE FROM runs WHERE id = ?").run(runId).changes > 0;
}
export function transaction<T>(db: Db, fn: () => T): T {
  // node:sqlite DatabaseSync exposes no transaction helper via Db; emulate
  // with explicit BEGIN/COMMIT so callers get atomicity without driver lock-in.
  db.exec("BEGIN");
  try { const out = fn(); db.exec("COMMIT"); return out; } catch (e) { db.exec("ROLLBACK"); throw e; }
}
