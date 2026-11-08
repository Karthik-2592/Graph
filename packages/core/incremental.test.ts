// Run: node packages/core/incremental.test.ts
import { openDb, migrate } from "./db.ts";
import { createRun, upsertNodes } from "./store.ts";
import { hashFile, filesNeedingIndex } from "./incremental.ts";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
const dir = mkdtempSync(path.join(tmpdir(), "inc-"));
const f = path.join(dir, "a.ts");
writeFileSync(f, "export const x = 1;\n");
const h1 = hashFile(f);
writeFileSync(f, "export const x = 2;\n");
assert(hashFile(f) !== h1, "hash changes with content");
const db = openDb(":memory:"); migrate(db);
const run = createRun(db, { root: dir });
upsertNodes(db, run, [{ id: "a.ts::", kind: "file", name: "a.ts", file_id: "a.ts", attrs: { hash: hashFile(f) } }]);
assert(filesNeedingIndex(db, run, [{ path: "a.ts", abs: f }]).length === 0, "unchanged file skipped");
writeFileSync(f, "export const x = 3;\n");
assert(filesNeedingIndex(db, run, [{ path: "a.ts", abs: f }]).length === 1, "changed file re-indexed");
console.log("incremental.test: all passed");
void readFileSync;
