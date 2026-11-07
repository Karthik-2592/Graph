// Parity check: v4 ParseResult converts to v5 with identical file graph.
import { parseRepository } from "../../lib/parser/index.ts";
import { openDb, migrate } from "../core/db.ts";
import { createRun, upsertNodes, upsertEdges, insertSites, setCoverage, transaction } from "../core/store.ts";
import { l1FileGraph } from "../core/projections.ts";
import { parseResultToGraph, adapterEnrichment } from "./ts-imports.ts";

const result = parseRepository("fixtures/shop");
const v5 = parseResultToGraph(result);
const db = openDb(":memory:"); migrate(db);
const run = createRun(db, { root: result.root });
transaction(db, () => { upsertNodes(db, run, v5.nodes); upsertEdges(db, run, v5.edges); insertSites(db, run, v5.sites); setCoverage(db, run, v5.coverage); });
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
assert(v5.nodes.length === result.files.length, "node count matches files");
assert(v5.edges.length === result.edges.length, "edge count matches v4 edges");
const l1 = l1FileGraph(db, run);
assert(l1.length > 0, "L1 non-empty");
const enrichment = adapterEnrichment(result);
console.log(`ts-imports.test: files=${result.files.length} v4edges=${result.edges.length} l1=${l1.length} adapterRoutes=${enrichment.nodes.length} — parity OK`);
