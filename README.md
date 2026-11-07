# Graph

Graph turns a TypeScript or JavaScript project on your own machine into an
interactive dependency map. It parses the real source files — imports,
re-exports, dynamic imports, and `require()` calls — into nodes and edges, and
lets you explore the shape of the codebase directly on the canvas.

Every box and every line comes from parsing the code. There is no model
guessing at structure, and nothing leaves the machine: no accounts, no
uploads, no API keys. Parse results persist in a local SQLite file
(`.graph/graph.db`) so a map can be reopened without re-parsing —
but the database never leaves this machine either.

## Tech stack

- **Next.js 16** — App Router UI and the server action that runs the parser.
- **TypeScript 5** — strict types across the app and parser.
- **ts-morph** — parses source files into deterministic AST graph structures.
- **React Flow (@xyflow/react)** + **dagre** — the interactive canvas and its layout.
- **SQLite** (Node's built-in `node:sqlite`, no extra dependency) — stores
  parse results in `.graph/graph.db` for reopening later.
- **Tailwind CSS v4** — the dense, high-information developer interface.

## Features

- **Local AST parsing**: point Graph at any directory on this machine; it
  walks and parses the TypeScript/JavaScript files in place.
- **Interactive canvas mapping**: zoom, expand folders into individual files,
  select modules, and view connected incoming and outgoing dependencies.
- **Blast radius & dependency chain**: arithmetic over the parsed edge list —
  what breaks if a file changes, and what a file transitively depends on.
- **Category rail**: files grouped by the role their framework's conventions
  give them (page routes, API endpoints, services, components, tests, …),
  with an unclassified bucket for everything else.
- **Route table**: routes whose method and full path are both written in the
  code, with omitted/withheld routes reported, never guessed.
- **Insights**: unimported files, heavily imported files, import loops, and
  long files — facts computed from the graph, in the browser, instantly.
- **Coverage reporting**: what was parsed, what was skipped and why, and every
  unresolved import.

## Quick start

Prerequisites: Node.js and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter the path to a
project on this machine (for example `C:\path\to\repository`), and press
**Parse**. The result is shown immediately and saved to the local SQLite
database; the **Saved parses** panel on the right reopens any earlier parse
without re-parsing, and deletes it from the database when asked. Set
`GRAPH_DB_PATH` to store the database somewhere else. The database file
is gitignored and never leaves this machine.

## Parser from the command line

The parser is standalone: it takes a directory and returns files, edges, and a
coverage report, with nothing else running.

```bash
npm run parse <dir>                 # print a summary
npm run parse <dir> --out out.json  # write the full result
npm run parse --read out.json       # validate a written result
npm run parse <dir> --all           # list every unresolved import
npm run insights out.json           # insights + reach checks
npm run map-counts out.json         # canvas node/edge counts
```
