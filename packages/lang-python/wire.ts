// Python wiring: detect .py files, run the Python plugin if scip-python
// is available; otherwise record a producer site (never silent).
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function detectPythonFiles(root: string): string[] {
  const out: string[] = [];
  const visit = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) { if (e.name !== "node_modules" && !e.name.startsWith(".")) visit(path.join(dir, e.name)); continue; }
      if (e.isFile() && e.name.endsWith(".py")) out.push(path.relative(root, path.join(dir, e.name)));
    }
  };
  if (statSync(root, { throwIfNoEntry: false })?.isDirectory()) visit(root);
  return out.sort();
}

export function hasScipPython(): boolean {
  try { execFileSync(process.platform === "win32" ? "scip-python.cmd" : "scip-python", ["--version"], { stdio: "pipe", shell: true }); return true; } catch { return false; }
}
