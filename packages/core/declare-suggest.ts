// U2: `graph declare suggest` — list undeclared dispatch sites with
// candidate implementers from relationships.
import type { Db } from "./db.ts";

export function suggestDeclarations(db: Db, runId: number): { from: string; candidates: string[] }[] {
  const sites = db.prepare("SELECT path, line FROM sites WHERE run_id=? AND kind='interface-dispatch' AND status='unrecognized'").all(runId) as { path: string; line: number }[];
  // Candidate implementers: nodes related by is_implementation (from SCIP
  // SymbolInformation.relationships, stored in attrs by ingestion).
  const impls = db.prepare("SELECT id FROM nodes WHERE run_id=? AND attrs LIKE '%is_implementation%'").all(runId) as { id: string }[];
  return sites.map((s) => ({ from: `${s.path}::dispatch@${s.line}`, candidates: impls.map((i) => i.id) }));
}
