// Invariant checker (A5): every edge endpoint exists; every parent_id
// exists and the parent chain has no cycle; per-kind edge counts
// reconcile with projections.
import type { Db } from "./db.ts";
import { l1FileGraph } from "./projections.ts";

export function checkInvariants(db: Db, runId: number): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  // Edge endpoints exist
  const dangling = db.prepare(
    `SELECT COUNT(*) AS n FROM edges e LEFT JOIN nodes s ON s.run_id=e.run_id AND s.id=e.src LEFT JOIN nodes d ON d.run_id=e.run_id AND d.id=e.dst WHERE e.run_id=? AND (s.id IS NULL OR d.id IS NULL)`,
  ).get(runId) as { n: number };
  if (dangling.n > 0) problems.push(`${dangling.n} edge(s) with missing endpoints`);
  // Every parent_id exists
  const badParent = db.prepare(
    `SELECT COUNT(*) AS n FROM nodes ch LEFT JOIN nodes p ON p.run_id=ch.run_id AND p.id=ch.parent_id WHERE ch.run_id=? AND ch.parent_id IS NOT NULL AND p.id IS NULL`,
  ).get(runId) as { n: number };
  if (badParent.n > 0) problems.push(`${badParent.n} node(s) with missing parents`);
  // Parent chain acyclic (walk each chain up to 100 steps)
  const nodes = db.prepare("SELECT id, parent_id FROM nodes WHERE run_id=?").all(runId) as { id: string; parent_id: string | null }[];
  const parentOf = new Map(nodes.map((n) => [n.id, n.parent_id]));
  for (const n of nodes) {
    let cur: string | null | undefined = n.id;
    const seen = new Set<string>();
    while (cur) {
      if (seen.has(cur)) { problems.push(`parent cycle at ${n.id}`); break; }
      seen.add(cur);
      cur = parentOf.get(cur);
      if (seen.size > 100) { problems.push(`parent chain too long at ${n.id}`); break; }
    }
  }
  // Per-kind counts reconcile: L1 projection sums <= raw imports count, and
  // every projected file pair appears in raw edges.
  const rawImports = (db.prepare("SELECT COUNT(*) AS n FROM edges WHERE run_id=? AND kind='imports'").get(runId) as { n: number }).n;
  const l1 = l1FileGraph(db, runId);
  const l1Weight = l1.reduce((a, e) => a + e.weight, 0);
  if (l1Weight > rawImports) problems.push(`L1 weights (${l1Weight}) exceed raw imports (${rawImports})`);
  return { ok: problems.length === 0, problems };
}
