// Strict gates G1–G8 (plan §8.2) over sites/coverage. Lenient reports,
// strict fails. `--fail-on` overrides which gates fail.
import type { Db } from "./db.ts";

export type GateResult = { id: string; ok: boolean; detail: string };
export const GATES = [
  { id: "G1", rule: "R1", desc: "every source file is in the one root program" },
  { id: "G2", rule: "R2", desc: "zero unresolved imports; zero non-literal import()/require()" },
  { id: "G3", rule: "R6", desc: "zero side-effect registration imports (allow-list excepted)" },
  { id: "G4", rule: "R3", desc: "zero raw network calls outside the sanctioned client" },
  { id: "G5", rule: "R4", desc: "zero route registrations outside the sanctioned register" },
  { id: "G6", rule: "R5", desc: "zero non-literal event names" },
  { id: "G7", rule: "D6", desc: "every interface/abstract dispatch site has a declaration" },
  { id: "G8", rule: "—", desc: "every declaration's endpoints exist (none stale)" },
] as const;

function count(db: Db, runId: number, kind: string, status?: string): number {
  const sql = status
    ? "SELECT COUNT(*) AS n FROM sites WHERE run_id=? AND kind=? AND status=?"
    : "SELECT COUNT(*) AS n FROM sites WHERE run_id=? AND kind=?";
  const row = status ? db.prepare(sql).get(runId, kind, status) : db.prepare(sql).get(runId, kind);
  return (row as { n: number }).n;
}

export function checkGates(db: Db, runId: number, opts: { strict?: boolean; failOn?: string[] } = {}): { gates: GateResult[]; failed: string[] } {
  const gates: GateResult[] = [
    { id: "G1", ok: count(db, runId, "file-outside-program") === 0, detail: "files outside program" },
    { id: "G2", ok: count(db, runId, "unresolved-import") === 0 && count(db, runId, "dynamic-import") === 0, detail: "unresolved/non-literal imports" },
    { id: "G3", ok: count(db, runId, "side-effect-import", "unrecognized") === 0, detail: "side-effect imports" },
    { id: "G4", ok: count(db, runId, "network-call", "unrecognized") === 0, detail: "raw network calls" },
    { id: "G5", ok: count(db, runId, "route-registration", "unrecognized") === 0, detail: "raw route registrations" },
    { id: "G6", ok: count(db, runId, "event-emit", "unrecognized") === 0, detail: "non-literal event names" },
    { id: "G7", ok: count(db, runId, "interface-dispatch", "unrecognized") === 0, detail: "undeclared dispatch sites" },
    { id: "G8", ok: count(db, runId, "unresolved-import", "declared") === 0, detail: "stale declarations" },
  ];
  const failSet = new Set(opts.failOn ?? (opts.strict ? gates.filter((g) => !g.ok).map((g) => g.id) : []));
  return { gates, failed: gates.filter((g) => failSet.has(g.id) && !g.ok).map((g) => g.id) };
}

export function coverageReport(db: Db, runId: number): { byStatus: Record<string, number>; byKind: Record<string, number>; sites: { kind: string; status: string; path: string | null; line: number | null; reason: string | null }[] } {
  const rows = db.prepare("SELECT kind, status, path, line, reason FROM sites WHERE run_id=? ORDER BY kind, path, line").all(runId) as { kind: string; status: string; path: string | null; line: number | null; reason: string | null }[];
  const byStatus: Record<string, number> = {}, byKind: Record<string, number> = {};
  for (const r of rows) { byStatus[r.status] = (byStatus[r.status] ?? 0) + 1; byKind[r.kind] = (byKind[r.kind] ?? 0) + 1; }
  return { byStatus, byKind, sites: rows };
}
