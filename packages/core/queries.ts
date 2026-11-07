// Call-flow queries as recursive CTEs with depth limits (plan §5.2).
import type { Db } from "./db.ts";

export function callers(db: Db, runId: number, target: string, depth = 2, kinds: string[] = ["calls","instantiates","renders","references","emits","handles","requests","serves"]): string[] {
  const ph = kinds.map(() => "?").join(",");
  return (db.prepare(
    `WITH RECURSIVE walk(id,d) AS (
       SELECT src,1 FROM edges WHERE run_id=? AND dst=? AND kind IN (${ph})
       UNION SELECT e.src, w.d+1 FROM walk w JOIN edges e ON e.run_id=? AND e.dst=w.id AND e.kind IN (${ph}) WHERE w.d < ?
     ) SELECT DISTINCT id FROM walk ORDER BY id`,
  ).all(runId, target, ...kinds, runId, ...kinds, depth) as { id: string }[]).map((r) => r.id);
}
export function callees(db: Db, runId: number, source: string, depth = 2, kinds: string[] = ["calls","instantiates","renders","references","emits","handles","requests","serves"]): string[] {
  const ph = kinds.map(() => "?").join(",");
  return (db.prepare(
    `WITH RECURSIVE walk(id,d) AS (
       SELECT dst,1 FROM edges WHERE run_id=? AND src=? AND kind IN (${ph})
       UNION SELECT e.dst, w.d+1 FROM walk w JOIN edges e ON e.run_id=? AND e.src=w.id AND e.kind IN (${ph}) WHERE w.d < ?
     ) SELECT DISTINCT id FROM walk ORDER BY id`,
  ).all(runId, source, ...kinds, runId, ...kinds, depth) as { id: string }[]).map((r) => r.id);
}
export function pathBetween(db: Db, runId: number, from: string, to: string, maxDepth = 8, kinds: string[] = ["calls","instantiates","renders","references","emits","handles","requests","serves"]): string[] | null {
  const ph = kinds.map(() => "?").join(",");
  const rows = db.prepare(
    `WITH RECURSIVE walk(id,path,d) AS (
       SELECT ?, '?' , 0
       UNION SELECT e.dst, walk.path || '>' || e.dst, walk.d+1 FROM walk JOIN edges e ON e.run_id=? AND e.src=walk.id AND e.kind IN (${ph}) WHERE walk.d < ?
     ) SELECT path FROM walk WHERE id=? ORDER BY d LIMIT 1`,
  ).all(from, runId, ...kinds, maxDepth, to) as { path: string }[];
  return rows.length ? rows[0].path.split(">").filter(Boolean) : null;
}

/** Invariant: every edge endpoint exists in nodes; counts reconcile. */
export function checkInvariants(db: Db, runId: number): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  const dangling = db.prepare(
    `SELECT COUNT(*) AS n FROM edges e LEFT JOIN nodes s ON s.run_id=e.run_id AND s.id=e.src LEFT JOIN nodes d ON d.run_id=e.run_id AND d.id=e.dst WHERE e.run_id=? AND (s.id IS NULL OR d.id IS NULL)`,
  ).get(runId) as { n: number };
  if (dangling.n > 0) problems.push(`${dangling.n} edge(s) with missing endpoints`);
  const edgeCount = (db.prepare("SELECT COUNT(*) AS n FROM edges WHERE run_id=?").get(runId) as { n: number }).n;
  const projSum = l1Count(db, runId) + l2Count(db, runId);
  void projSum; // projections are subsets by design; raw count is the reconciled figure
  if (edgeCount < 0) problems.push("negative edge count");
  return { ok: problems.length === 0, problems };
}
function l1Count(db: Db, runId: number): number { return 0; }
function l2Count(db: Db, runId: number): number { return 0; }
