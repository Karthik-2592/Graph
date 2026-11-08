// `graph` CLI (plan §10). Full implementation on top of packages/core.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { parseRepository } from "../../lib/parser/index.ts";
import { validateParseResult } from "../../lib/parser/contract.ts";
import { openDb, migrate } from "../core/db.ts";
import { createRun, upsertNodes, upsertEdges, insertSites, setCoverage, transaction } from "../core/store.ts";
import { parseResultToGraph } from "../lang-typescript/ts-imports.ts";
import { l1FileGraph, l2CallGraph } from "../core/projections.ts";
import { callers, callees, pathBetween } from "../core/queries.ts";
import { checkGates, coverageReport } from "../core/gates.ts";
import { doctorReport } from "./doctor.ts";
import { loadConfig } from "./config.ts";
import { toDot, toJson, toGraphMl } from "./export.ts";

function dbPath(root: string) {
  const dir = path.join(root, ".graph");
  mkdirSync(dir, { recursive: true });
  return path.join(dir, "graph.db");
}

export function indexRepo(root: string, mode = "lenient"): number {
  const result = validateParseResult(parseRepository(root));
  const db = openDb(dbPath(root));
  migrate(db);
  const runId = createRun(db, { root: result.root, mode });
  const v5 = parseResultToGraph(result);
  transaction(db, () => { upsertNodes(db, runId, v5.nodes); upsertEdges(db, runId, v5.edges); insertSites(db, runId, v5.sites); setCoverage(db, runId, v5.coverage); });
  return runId;
}

function openRun(root: string, runId?: number): { db: ReturnType<typeof openDb>; runId: number } {
  const db = openDb(dbPath(root));
  migrate(db);
  if (runId) return { db, runId };
  const rows = db.prepare("SELECT id FROM runs ORDER BY started_at DESC LIMIT 1").all() as { id: number }[];
  if (rows.length === 0) throw new Error("no runs — run `graph index` first");
  return { db, runId: rows[0].id };
}

export function main(argv: string[]): number {
  const [cmd, ...rest] = argv;
  const root = rest.find((a) => !a.startsWith("-")) ?? ".";
  switch (cmd) {
    case "index": {
      const mode = rest.includes("--strict") ? "strict" : "lenient";
      const id = indexRepo(root, mode);
      console.log(`indexed ${root} run=${id} mode=${mode}`);
      return 0;
    }
    case "check": {
      const { db, runId } = openRun(root);
      const strict = rest.includes("--strict");
      const ff = rest.find((a) => a.startsWith("--fail-on="))?.slice(10).split(",") ?? [];
      const { gates, failed } = checkGates(db, runId, { strict, failOn: ff });
      for (const g of gates) console.log(`${g.state === "ok" ? "ok  " : g.state === "fail" ? "FAIL" : "ne  "} ${g.id}: ${g.detail}`);
      console.log(failed.length ? `failed: ${failed.join(",")}` : "all gates pass");
      return failed.length ? 1 : 0;
    }
    case "callers": case "callees": {
      const id = rest.find((a) => !a.startsWith("-") && a !== root);
      if (!id) { console.error(`usage: graph ${cmd} <node-id> [--depth N]`); return 2; }
      const depth = +((rest.find((a) => a.startsWith("--depth="))?.slice(8)) ?? "2");
      const { db, runId } = openRun(root);
      const out = cmd === "callers" ? callers(db, runId, id, depth) : callees(db, runId, id, depth);
      console.log(out.join("\n"));
      return 0;
    }
    case "path": {
      const [a, b] = rest.filter((x) => !x.startsWith("-") && x !== root);
      if (!a || !b) { console.error("usage: graph path <a> <b>"); return 2; }
      const { db, runId } = openRun(root);
      const p = pathBetween(db, runId, a, b);
      console.log(p ? p.join(" -> ") : "no path");
      return p ? 0 : 1;
    }
    case "coverage": {
      const { db, runId } = openRun(root);
      console.log(JSON.stringify(coverageReport(db, runId), null, 2));
      return 0;
    }
    case "export": {
      const { db, runId } = openRun(root);
      const level = rest.find((a) => a.startsWith("--level="))?.slice(8) ?? "1";
      const format = rest.find((a) => a.startsWith("--format="))?.slice(9) ?? "json";
      const edges = level === "2" ? l2CallGraph(db, runId) : l1FileGraph(db, runId);
      console.log(format === "dot" ? toDot(edges) : format === "graphml" ? toGraphMl(edges) : toJson(edges));
      return 0;
    }
    case "doctor": console.log(doctorReport(root)); return 0;
    case "--help": case "-h": case undefined:
      console.log("graph index|check|callers|callees|path|coverage|export|doctor"); return cmd ? 0 : 2;
    default: console.error(`unknown command: ${cmd}`); return 2;
  }
}
if (process.argv[1]?.endsWith("main.ts")) process.exit(main(process.argv.slice(2)));
