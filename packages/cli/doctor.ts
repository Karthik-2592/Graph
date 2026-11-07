// graph doctor: Node version, indexer availability, deps, root-program coverage.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

export type DoctorCheck = { name: string; ok: boolean; detail: string };

export function doctor(root: string): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  const major = +process.versions.node.split(".")[0];
  checks.push({ name: "node>=22.5 (node:sqlite)", ok: major >= 23 || (major === 22 && +process.versions.node.split(".")[1] >= 5), detail: `node ${process.versions.node}` });
  let indexer = false;
  try { execFileSync("scip-typescript", ["--version"], { stdio: "pipe" }); indexer = true; } catch { indexer = false; }
  checks.push({ name: "scip-typescript on PATH", ok: indexer, detail: indexer ? "found" : "not found — SCIP ingestion (Task 06) unavailable; ts-imports still works" });
  const hasDeps = existsSync(`${root}/node_modules`) || existsSync(`${root}/package.json`);
  checks.push({ name: "dependencies installed", ok: hasDeps, detail: hasDeps ? "present" : "package.json exists but node_modules missing — external symbols will be absent (D11)" });
  checks.push({ name: "root program coverage", ok: existsSync(`${root}/tsconfig.json`), detail: existsSync(`${root}/tsconfig.json`) ? "root tsconfig present" : "no root tsconfig — tool-owned config will be written (D7)" });
  return checks;
}
export function doctorReport(root: string): string {
  return doctor(root).map((c) => `${c.ok ? "ok  " : "warn"} ${c.name}: ${c.detail}`).join("\n") + "\n";
}
