// Tri-state gates (A1): ok | fail | not-evaluated. A gate that cannot
// observe anything reports not-evaluated, never ok. Strict treats
// not-evaluated as failure unless --allow-unevaluated is passed.
import type { Db } from "./db.ts";
import { setCoverage } from "./store.ts";

export type GateState = "ok" | "fail" | "not-evaluated";
export type GateResult = { id: string; state: GateState; detail: string };

export const GATES = [
  { id: "G1", rule: "R1", desc: "every source file is in the one root program", producers: ["scip", "walk"] },
  { id: "G2", rule: "R2", desc: "zero unresolved imports; zero non-literal import()/require()", producers: ["ts-imports"] },
  { id: "G3", rule: "R6", desc: "zero side-effect registration imports", producers: ["profile"] },
  { id: "G4", rule: "R3", desc: "zero raw network calls outside the sanctioned client", producers: ["extractors", "profile"] },
  { id: "G5", rule: "R4", desc: "zero route registrations outside the sanctioned register", producers: ["extractors"] },
  { id: "G6", rule: "R5", desc: "zero non-literal event names", producers: ["extractors"] },
  { id: "G7", rule: "D6", desc: "every interface/abstract dispatch site has a declaration", producers: ["scip", "declarations"] },
  { id: "G8", rule: "—", desc: "every declaration's endpoints exist (none stale)", producers: ["declarations"] },
] as const;

export type ProducerStatus = "ran" | "skipped" | "failed";

export function recordProducers(db: Db, runId: number, producers: Record<string, ProducerStatus>): void {
  setCoverage(db, runId, Object.fromEntries(Object.entries(producers).map(([k, v]) => [`producer:${k}`, v])));
}

export function producerRan(db: Db, runId: number, name: string): boolean {
  const row = db.prepare("SELECT value FROM coverage WHERE run_id=? AND key=?").get(runId, `producer:${name}`) as { value: string } | undefined;
  return row?.value === "ran";
}

function count(db: Db, runId: number, kind: string, status?: string): number {
  const sql = status
    ? "SELECT COUNT(*) AS n FROM sites WHERE run_id=? AND kind=? AND status=?"
    : "SELECT COUNT(*) AS n FROM sites WHERE run_id=? AND kind=?";
  const row = status ? db.prepare(sql).get(runId, kind, status) : db.prepare(sql).get(runId, kind);
  return (row as { n: number }).n;
}

export function checkGates(db: Db, runId: number, opts: { strict?: boolean; failOn?: string[]; allowUnevaluated?: boolean } = {}): { gates: GateResult[]; failed: string[]; unevaluated: string[] } {
  const site = (kind: string, status?: string) => count(db, runId, kind, status);
  const gate = (id: string, needs: string[], ok: boolean, detail: string): GateResult => {
    if (!needs.every((p) => producerRan(db, runId, p))) return { id, state: "not-evaluated", detail: `${detail} (needs ${needs.join("+")})` };
    return { id, state: ok ? "ok" : "fail", detail };
  };
  const gates: GateResult[] = [
    gate("G1", ["scip", "walk"], site("file-outside-program") === 0, "files outside program"),
    gate("G2", ["ts-imports"], site("unresolved-import") === 0 && site("dynamic-import") === 0, "unresolved/non-literal imports"),
    gate("G3", ["profile"], site("side-effect-import", "unrecognized") === 0, "side-effect imports"),
    gate("G4", ["extractors", "profile"], site("network-call", "unrecognized") === 0, "raw network calls"),
    gate("G5", ["extractors"], site("route-registration", "unrecognized") === 0, "raw route registrations"),
    gate("G6", ["extractors"], site("event-emit", "unrecognized") === 0, "non-literal event names"),
    gate("G7", ["scip", "declarations"], site("interface-dispatch", "unrecognized") === 0, "undeclared dispatch sites"),
    gate("G8", ["declarations"], site("stale-declaration") === 0, "stale declarations"),
  ];
  const unevaluated = gates.filter((g) => g.state === "not-evaluated").map((g) => g.id);
  const failSet = new Set(opts.failOn ?? []);
  const failed = gates.filter((g) => (failSet.has(g.id) && g.state !== "ok") || (opts.strict && g.state === "fail") || (opts.strict && g.state === "not-evaluated" && !opts.allowUnevaluated)).map((g) => g.id);
  return { gates, failed, unevaluated };
}

export function coverageReport(db: Db, runId: number): { byStatus: Record<string, number>; byKind: Record<string, number>; sites: { kind: string; status: string; path: string | null; line: number | null; reason: string | null }[] } {
  const rows = db.prepare("SELECT kind, status, path, line, reason FROM sites WHERE run_id=? ORDER BY kind, path, line").all(runId) as { kind: string; status: string; path: string | null; line: number | null; reason: string | null }[];
  const byStatus: Record<string, number> = {}, byKind: Record<string, number> = {};
  for (const r of rows) { byStatus[r.status] = (byStatus[r.status] ?? 0) + 1; byKind[r.kind] = (byKind[r.kind] ?? 0) + 1; }
  return { byStatus, byKind, sites: rows };
}
