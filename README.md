# Graph

Graph turns a TypeScript, JavaScript, Python, or Go project on your own
machine into an interactive dependency map — files, then functions.
Every box and every line comes from really parsing the code (SCIP
indexers + AST passes). No model guesses at structure, nothing leaves
the machine: no accounts, no uploads, no API keys.

## Tech stack

- **Next.js 16** — App Router UI and server actions.
- **TypeScript 5** — strict types across the app and parser.
- **ts-morph** — AST parsing for the file graph (L1) and `roleAt` classification.
- **SCIP** (`@sourcegraph/scip-typescript`, `@scip-code/scip` protobuf
  bindings) — function/class call flow (L2).
- **React Flow (@xyflow/react)** + **dagre** (instant) and **ELK**
  (scales to thousands of nodes) — the canvas.
- **SQLite** (Node's built-in `node:sqlite`) — normalized v5 store
  (`runs`/`nodes`/`edges`/`sites`/`coverage`) in `.graph/graph.db`;
  legacy v4 parses load through a converter.
- **Tailwind CSS v4** — dense developer UI.

## Features

- **Local parsing**: point Graph at any directory; imports, re-exports,
  dynamic imports, and `require()` become edges. Nothing uploaded.
- **Two zoom levels**: L1 file/package dependencies, L2 function/class
  call flow — both projections of one graph, with provenance per edge.
- **Interactive canvas**: hierarchical folding, ELK layout, level toggle,
  call-flow mode (entry point + depth), coverage panel, blast radius.
- **Lenient/strict dial**: index anything and report unresolved sites.
  Gates are tri-state (`ok` / `fail` / `not-evaluated`); in strict mode a
  gate that could not be evaluated fails unless `--allow-unevaluated`
  is passed. `graph check --strict` fails on gates G1–G8.
- **Extractors**: event buses, shared route contracts, and handler tables
  become first-class `event`/`route` nodes — dynamic links SCIP alone misses.
- **Category rail**: files grouped by framework-convention roles, with an
  unclassified bucket for everything else.
- **Route table, insights, coverage**: routes with exact method+path only,
  unimported/hot/loop/long-file facts, and what was skipped and why —
  all arithmetic over data already in the browser, no spinners.
- **Multi-language plugin contract**: TypeScript complete; Python and Go
  runners in `packages/lang-python` / `packages/lang-go`; incremental
  re-indexing by per-file hash.

## Quick start

Prerequisites: Node.js (≥ 22.5 for `node:sqlite`), npm. For SCIP
indexing, install the indexer:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter a local
directory path, press **Parse**. Saved parses reopen from the local
SQLite database (`GRAPH_DB_PATH` overrides the location).

## CLI

```bash
graph index <repo> [--strict]              # parse + write .graph/graph.db
graph check <repo> [--strict] [--fail-on=G1,G4]
graph callers|callees <node-id> [--depth=2]
graph path <a> <b>
graph coverage <repo>                      # sites by status/kind (JSON)
graph export <repo> --level=1|2 --format=json|dot|graphml
graph doctor                               # Node, indexer, deps, root program
```

Legacy parser scripts still work: `npm run parse|insights|map-counts`.

## Status

| Area | State |
|---|---|
| L1 file graph (parser) | ✅ shipped, tested (41-edge parity) |
| L2 call flow (SCIP + roleAt) | ✅ library + fixture-perfect (28/6/7); CLI/app wiring in progress |
| Viewer (ELK canvas, coverage, flow, L1/L2 tabs) | ✅ shipped; L2 tab needs wired pipeline for real data |
| Strict gates | ⚠️ tri-state implemented; site producers partial (G2 only) |
| Python / Go | ⚠️ skeletons; Python yields no function edges yet |
| Incremental indexing | ⚠️ helper exists, unwired |

## Development

```bash
npm test          # every *.test.ts outside fixtures/ (scorer + packages)
```

Fixtures (`fixtures/shop`, `shop-strict`, `shop-dynamic`) are generated
from the experiment artifacts: `npm run generate-fixtures`. The shop
fixture scores **calls 28/28, renders 6/6, instantiates 7/7, 0 false
edges** against `fixtures/truth/shop.json`. Spike decisions live in
`docs/spikes/` (SCIP reading, performance budgets, workspace layouts,
viewer stack). The implementation plan is `docs/graph-implementation-plan.md`.
