// Thin Db interface over node:sqlite (swap to better-sqlite3 later).
// @ts-expect-error - node:sqlite types aren't in @types/node 20
import { DatabaseSync } from "node:sqlite";
import { SCHEMA_SQL } from "./schema.ts";

export type Db = {
  exec(sql: string): void;
  prepare(sql: string): { get(...p: unknown[]): unknown; all(...p: unknown[]): unknown[]; run(...p: unknown[]): { changes: number | bigint } };
};

export function openDb(file: string): Db {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  return db as unknown as Db;
}

export function migrate(db: Db): void {
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA_SQL); // CREATE TABLE/INDEX IF NOT EXISTS semantics via idempotent exec;
  // Legacy v4 rows (lib/store/sqlite.ts `analyses`) are intentionally untouched —
  // Task 04's converter reads them; this function never drops tables.
}
