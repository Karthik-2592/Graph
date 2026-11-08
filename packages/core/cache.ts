// B3: cache key for a v5 run — root, tree hash, profile hash, indexer versions.
import { createHash } from "node:crypto";

export function cacheKey(root: string, treeHash: string, profileHash: string, toolVersions: Record<string, string>): string {
  return createHash("sha256").update(JSON.stringify({ root, treeHash, profileHash, toolVersions })).digest("hex").slice(0, 16);
}

export function treeHashOf(files: { path: string; hash: string }[]): string {
  return createHash("sha256").update(files.map((f) => `${f.path}:${f.hash}`).sort().join("\n")).digest("hex");
}
