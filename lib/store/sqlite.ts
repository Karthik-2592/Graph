import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
// @ts-expect-error - node:sqlite types aren't in @types/node 20; the runtime (Node 22.5+) has it built in.
import { DatabaseSync } from "node:sqlite";
import { deserializeParseResult, serializeParseResult } from "../parser/contract.ts";
import type { ParseResult } from "../parser/types.ts";

// Persistence for a single-user local tool: one SQLite file on this machine,
// holding the parse results themselves as contract-checked JSON. No users,
// no tenants, no stages — the only question this answers is "what did I
// parse, and can I reopen it without parsing again?".
//
// The driver is Node's built-in node:sqlite, so there's no package to
// install and no native build. Override the location with GRAPH_DB_PATH.

export type AnalysisSummary = {
  id: string;
  root: string;
  fileCount: number;
  edgeCount: number;
  createdAt: string;
  updatedAt: string;
};

const globalForDb = globalThis as typeof globalThis & { __graphDb?: DatabaseSync };

function db(): DatabaseSync {
  if (globalForDb.__graphDb) return globalForDb.__graphDb;
  const file = process.env.GRAPH_DB_PATH?.trim() || path.join(process.cwd(), ".graph", "graph.db");
  mkdirSync(path.dirname(file), { recursive: true });
  const database = new DatabaseSync(file);
  // Single process owns the file; WAL + a busy timeout just keep the CLI
  // scripts and the dev server from tripping over each other.
  database.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  database.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      root TEXT NOT NULL,
      schema_version INTEGER NOT NULL,
      file_count INTEGER NOT NULL,
      edge_count INTEGER NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS analyses_updated_idx ON analyses (updated_at DESC);
  `);
  globalForDb.__graphDb = database;
  return database;
}

export function saveAnalysis(result: ParseResult): string {
  const id = randomUUID();
  const now = new Date().toISOString();
  db()
    .prepare(
      "INSERT INTO analyses (id, root, schema_version, file_count, edge_count, result_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(id, result.root, result.schemaVersion, result.files.length, result.edges.length, serializeParseResult(result), now, now);
  return id;
}

export function listAnalyses(limit = 50): AnalysisSummary[] {
  const rows = db()
    .prepare("SELECT id, root, file_count, edge_count, created_at, updated_at FROM analyses ORDER BY updated_at DESC LIMIT ?")
    .all(limit) as unknown as { id: string; root: string; file_count: number; edge_count: number; created_at: string; updated_at: string }[];
  return rows.map((r) => ({ id: r.id, root: r.root, fileCount: r.file_count, edgeCount: r.edge_count, createdAt: r.created_at, updatedAt: r.updated_at }));
}

// Re-read through the parser's contract, so a hand-edited or older-schema row
// fails loudly instead of drawing a wrong map.
export function loadAnalysis(id: string): ParseResult | null {
  const row = db().prepare("SELECT result_json FROM analyses WHERE id = ?").get(id) as unknown as { result_json: string } | undefined;
  return row ? deserializeParseResult(row.result_json) : null;
}

export function deleteAnalysis(id: string): boolean {
  return db().prepare("DELETE FROM analyses WHERE id = ?").run(id).changes > 0;
}
