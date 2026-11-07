// Schema v5 (docs/graph-implementation-plan.md §5). Normalized tables with
// provenance; zoom levels are group-bys on the containment tree.
export const SCHEMA_VERSION = 5;
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY, root TEXT NOT NULL, commit_hash TEXT, started_at TEXT NOT NULL,
  mode TEXT NOT NULL, profile_hash TEXT, tool_versions TEXT, schema_version INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS nodes (
  run_id INTEGER NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL,
  name TEXT NOT NULL, parent_id TEXT, file_id TEXT, package_id TEXT,
  lang TEXT, path TEXT, start_line INT, start_col INT, end_line INT, end_col INT,
  role TEXT, attrs TEXT, PRIMARY KEY (run_id, id)
);
CREATE TABLE IF NOT EXISTS edges (
  run_id INTEGER NOT NULL, src TEXT NOT NULL, dst TEXT NOT NULL, kind TEXT NOT NULL,
  provenance TEXT NOT NULL, count INT NOT NULL DEFAULT 1,
  resolved INT NOT NULL DEFAULT 1, may INT NOT NULL DEFAULT 0, attrs TEXT,
  PRIMARY KEY (run_id, src, dst, kind, provenance)
);
CREATE TABLE IF NOT EXISTS sites (
  run_id INTEGER NOT NULL, id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL,
  status TEXT NOT NULL, node_id TEXT, path TEXT, line INT, col INT, reason TEXT
);
CREATE TABLE IF NOT EXISTS coverage (run_id INTEGER NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (run_id, key));
CREATE INDEX IF NOT EXISTS edges_src ON edges (run_id, src, kind);
CREATE INDEX IF NOT EXISTS edges_dst ON edges (run_id, dst, kind);
CREATE INDEX IF NOT EXISTS nodes_parent ON nodes (run_id, parent_id);
CREATE INDEX IF NOT EXISTS nodes_file ON nodes (run_id, file_id);
`;
export const EDGE_KINDS = ["imports","uses","calls","instantiates","renders","references","extends","implements","emits","handles","requests","serves","any"] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];
export type NodeKind = "repo"|"package"|"dir"|"file"|"module-init"|"class"|"interface"|"type"|"function"|"method"|"property-function"|"route"|"event"|"external";
export type SiteKind = "dynamic-import"|"computed-call"|"network-call"|"event-emit"|"route-registration"|"interface-dispatch"|"side-effect-import"|"unresolved-import"|"file-outside-program";
export type SiteStatus = "recognized"|"unrecognized"|"declared";
