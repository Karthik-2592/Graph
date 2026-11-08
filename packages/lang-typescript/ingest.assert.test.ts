// Self-contained ingest test (A4): copy fixture to temp, run the real
// pipeline (index -> ingest with roleAt+refineScopes), assert exact
// equality with truth. Requires scip-typescript on PATH; skips otherwise.
// Run: node packages/lang-typescript/ingest.assert.test.ts
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Project } from "ts-morph";
import { ingestScip } from "./ingest.ts";
import { roleAt, refineScopes } from "./roleat.ts";
import { score, type Truth } from "../../fixtures/scorer.ts";
import { readFileSync } from "node:fs";

const cli = process.platform === "win32" ? "node_modules\\.bin\\scip-typescript.cmd" : "node_modules/.bin/scip-typescript";
let hasIndexer = false;
try { execFileSync(cli, ["--version"], { stdio: "pipe", shell: true }); hasIndexer = true; } catch { hasIndexer = false; }
if (!hasIndexer) { console.log("SKIP: scip-typescript not installed (npm i @sourcegraph/scip-typescript)"); process.exit(0); }

const src = path.resolve("fixtures/shop");
const dir = mkdtempSync(path.join(tmpdir(), "graph-ingest-"));
try {
  const copy = path.join(dir, "shop");
  cpSync(src, copy, { recursive: true });
  const scip = path.join(dir, "shop.scip");
  execFileSync(cli, ["index", "--cwd", copy, "--infer-tsconfig", "--output", scip, "--no-progress-bar"], { stdio: "pipe", shell: true });
  const project = new Project({ useInMemoryFileSystem: false });
  const cache = new Map<string, ReturnType<typeof project.addSourceFileAtPath>>();
  const get = (f: string) => { if (!cache.has(f)) cache.set(f, project.addSourceFileAtPath(path.join(copy, f))); return cache.get(f)!; };
  const r = ingestScip(scip, { roleAt: (f, l, c) => roleAt(get(f), l, c), refineScopes: (f) => refineScopes(get(f), f) });
  const truth = JSON.parse(readFileSync(new URL("../../fixtures/truth/shop.json", import.meta.url), "utf8")) as Truth;
  delete (truth as { dynamic?: unknown }).dynamic; // dynamic links need extractors (Track E), not ingest
  const mk = (k: string) => r.edges.filter((e) => e.kind === k).map((e) => [e.src, e.dst] as [string, string]);
  const s = score(truth, { calls: mk("calls"), renders: mk("renders"), instantiates: mk("instantiates") });
  let ok = true;
  for (const [k, v] of Object.entries(s)) {
    if (v.missed.length || v.extra.length) { ok = false; console.log(`${k}: missed ${v.missed.length} extra ${v.extra.length}`); for (const m of [...v.missed, ...v.extra]) console.log(" ", m.join(" -> ")); }
  }
  if (!ok) { console.error("FAIL: ingest does not match truth exactly"); process.exit(1); }
  console.log("ingest.assert.test: exact match with truth (calls, renders, instantiates, 0 extras)");
} finally { rmSync(dir, { recursive: true, force: true }); }
void existsSync;
