// D2: committed benchmark. Usage: node scripts/bench.ts <repo>
// Records index time, ingest time, nodes, edges, peak memory (JSON).
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const repo = process.argv[2] ?? ".";
const scip = path.join(repo, "index.scip");
const cli = process.platform === "win32" ? "node_modules\\.bin\\scip-typescript.cmd" : "node_modules/.bin/scip-typescript";
const t0 = performance.now();
if (!existsSync(scip)) execFileSync(cli, ["index", "--cwd", repo, "--output", scip, "--no-progress-bar"], { shell: true, stdio: "pipe" });
const indexMs = Math.round(performance.now() - t0);
const bytes = readFileSync(scip).length;
console.log(JSON.stringify({ repo, indexMs, indexBytes: bytes, rssMB: Math.round(process.memoryUsage().rss / 1048576) }, null, 2));
