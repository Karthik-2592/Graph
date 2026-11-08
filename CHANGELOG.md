# Changelog

## [0.2.0] - 2026-11-08

### Added
- L1/L2 projections of one v5 graph with provenance per edge
- SCIP ingestion (calls, instantiates, renders, references) — shop fixture
  28/28 calls, 6/6 renders, 7/7 instantiates, 0 false edges
- ELK layered layout in the canvas (dagre instant fallback)
- Coverage tab, flow tab (entry points + depth), Graph tab (L1/L2 +
  lazy neighbourhood expansion)
- `graph` CLI: index, check, callers, callees, path, coverage, export, doctor
- Tri-state gates (ok / fail / not-evaluated), site producers for G1–G8
- Extractors (events, route contract, handler tables), declarations
- Python (WASM tree-sitter) and Go runners through the shared core
- Incremental indexing by per-file hash
- Custom ESLint rules R4/R5, `graph declare suggest`

### Changed
- README reflects shipped state with a status table
- Spike S3 corrected (interface methods are kind 26, not 66)

## [0.1.0]
- Local AST file graph (v4), React Flow canvas, saved parses in SQLite
