// Projections (plan §5.2): all group-bys using file_id/package_id/parent_id.
import type { Db } from "./db.ts";

export type WeightedEdge = { src: string; dst: string; kind: string; weight: number };

/** L1 (default): `imports` between files; toggle adds `uses`. */
export function l1FileGraph(db: Db, runId: number, kinds: string[] = ["imports"]): WeightedEdge[] {
  const ph = kinds.map(() => "?").join(",");
  const rows = db.prepare(
    `SELECT s.file_id AS src, d.file_id AS dst, e.kind AS kind, SUM(e.count) AS weight
     FROM edges e JOIN nodes s ON s.run_id = e.run_id AND s.id = e.src
                  JOIN nodes d ON d.run_id = e.run_id AND d.id = e.dst
     WHERE e.run_id = ? AND e.kind IN (${ph}) AND s.file_id IS NOT NULL AND d.file_id IS NOT NULL AND s.file_id <> d.file_id
     GROUP BY 1,2,3 ORDER BY 1,2,3`,
  ).all(runId, ...kinds) as { src: string; dst: string; kind: string; weight: number }[];
  return rows;
}

/** L2: function/class nodes, call-flow kinds; files/classes/dirs are groups. */
export function l2CallGraph(db: Db, runId: number, kinds: string[] = ["calls","instantiates","renders","emits","handles","requests","serves"]): WeightedEdge[] {
  const ph = kinds.map(() => "?").join(",");
  const rows = db.prepare(
    `SELECT e.src AS src, e.dst AS dst, e.kind AS kind, SUM(e.count) AS weight
     FROM edges e WHERE e.run_id = ? AND e.kind IN (${ph}) GROUP BY 1,2,3 ORDER BY 1,2,3`,
  ).all(runId, ...kinds) as { src: string; dst: string; kind: string; weight: number }[];
  return rows;
}
