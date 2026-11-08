// Discover every *.test.ts outside fixtures/ and run them with node.
// Usage: node scripts/run-tests.mjs
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

function find(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next" || e === ".git" || e === ".worktrees") continue;
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== "fixtures") find(p, out); }
    else if (e.endsWith(".test.ts")) out.push(p);
  }
  return out;
}
const tests = find(process.cwd()).sort();
console.log(`running ${tests.length} test files`);
let failed = 0;
for (const t of tests) {
  try { execFileSync("node", [t], { stdio: "inherit" }); }
  catch { failed++; console.error(`FAILED: ${t}`); }
}
console.log(failed ? `${failed} FAILED` : "all tests passed");
process.exit(failed ? 1 : 0);
