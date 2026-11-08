// Incremental indexing (Phase 8): per-file hashes skip unchanged files.
// A file is re-indexed only if its sha256 changed or it is new.
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import type { Db } from "./db.ts";

export function hashFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function filesNeedingIndex(db: Db, runId: number, files: { path: string; abs: string }[]): { path: string; hash: string }[] {
  const rows = db.prepare("SELECT id, attrs FROM nodes WHERE run_id=? AND kind='file'").all(runId) as { id: string; attrs: string | null }[];
  const prev = new Map(rows.map((r) => [r.id.replace(/::$/, ""), r.attrs ? (JSON.parse(r.attrs).hash as string | undefined) : undefined]));
  return files.filter((f) => !existsSync(f.abs) || prev.get(f.path) !== hashFile(f.abs)).map((f) => ({ path: f.path, hash: hashFile(f.abs) }));
}
