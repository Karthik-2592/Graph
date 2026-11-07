// Single-root-program SCIP runner (D7). Reads via @scip-code/scip bindings
// (Spike S1 decision). Never shells out to pnpm/yarn (Spike S4).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fromBinary } from "@bufbuild/protobuf";
import { IndexSchema } from "@scip-code/scip";

export type Project = { root: string };

export function runIndexer(root: string, out: string, tool = "scip-typescript"): { indexBytes: number; filesInProgram: number; filesOutside: string[] } {
  const hadTsconfig = existsSync(path.join(root, "tsconfig.json"));
  const args = ["index", "--cwd", root, "--output", out, "--no-progress-bar"];
  if (!hadTsconfig) args.push("--infer-tsconfig");
  try {
    execFileSync(tool, args, { stdio: "pipe" });
  } finally {
    // --infer-tsconfig writes {} into the repo root; remove it (Spike S4).
    if (!hadTsconfig) { const p = path.join(root, "tsconfig.json"); if (existsSync(p) && readFileSync(p, "utf8").trim() === "{}") rmSync(p); }
  }
  const index = fromBinary(IndexSchema, readFileSync(out));
  const inProgram = new Set(index.documents.map((d) => d.relativePath));
  return { indexBytes: readFileSync(out).length, filesInProgram: inProgram.size, filesOutside: [] };
}

/** LanguagePlugin skeleton (plan §6) — the contract Task 14 reviews. */
export const typescriptPlugin = {
  id: "typescript" as const,
  detect(_root: string): Project[] { return [{ root: _root }]; },
  indexer: {
    command: (p: Project, out: string) => ["scip-typescript", "index", "--cwd", p.root, "--output", out],
    requiresInstalledDeps: false,
  },
};
