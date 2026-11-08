// Verify C1: arrow consts credited correctly against a real index.
import { execFileSync } from "node:child_process";
import { Project } from "ts-morph";
import { ingestScip } from "./packages/lang-typescript/ingest.ts";
import { roleAt, refineScopes } from "./packages/lang-typescript/roleat.ts";
import { score, type Truth } from "./fixtures/scorer.ts";
import { readFileSync } from "node:fs";
import path from "node:path";

const scip = `${process.env.TEMP}\\arrow.scip`;
const cli = "node_modules\\.bin\\scip-typescript.cmd";
execFileSync(cli, ["index", "--cwd", path.resolve("fixtures/arrow-consts"), "--infer-tsconfig", "--output", scip, "--no-progress-bar"], { shell: true, stdio: "pipe" });
const project = new Project({ useInMemoryFileSystem: false });
const cache = new Map<string, ReturnType<typeof project.addSourceFileAtPath>>();
const fixtureRoot = path.resolve("fixtures/arrow-consts");
const get = (f: string) => { if (!cache.has(f)) cache.set(f, project.addSourceFileAtPath(path.join(fixtureRoot, f))); return cache.get(f)!; };
import { functionValuedNames } from "./packages/lang-typescript/function-consts.ts";
get("src.ts"); // ensure the fixture file is in the project before scanning
const r = ingestScip(scip, { roleAt: (f, l, c) => roleAt(get(f), l, c), refineScopes: (f) => refineScopes(get(f), f), functionValued: functionValuedNames(project) });
const truth = JSON.parse(readFileSync(new URL("./fixtures/truth/arrow-consts.json", import.meta.url), "utf8")) as Truth;
const calls = r.edges.filter((e) => e.kind === "calls").map((e) => [e.src, e.dst] as [string, string]);
const s = score(truth, { calls, renders: [], instantiates: [] });
console.log(`calls ${s.calls.found}/${s.calls.truth} extra ${s.calls.extra.length}`);
for (const m of s.calls.missed) console.log(" MISSED", m.join(" -> "));
for (const m of s.calls.extra) console.log(" EXTRA", m.join(" -> "));
