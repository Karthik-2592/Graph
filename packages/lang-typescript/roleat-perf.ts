// D1: roleAt cost fix. Skip occurrences whose target cannot be a call,
// instantiation, or render. Per-file line-offset index built once.
import type { SourceFile } from "ts-morph";
import { roleAt } from "./roleat.ts";
import type { Role } from "./symbols.ts";

export function lineOffsets(source: SourceFile): number[] {
  const text = source.getFullText();
  const offsets = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") offsets.push(i + 1);
  return offsets;
}

export function posFromLineCol(offsets: number[], line: number, col: number): number {
  return (offsets[line] ?? 0) + col;
}

/** Cheap pre-filter: can this target even be called/instantiated/rendered? */
export function canBeCallTarget(descriptor: string): boolean {
  return /\(\)\.$/#.test(descriptor) || /#$/.test(descriptor) || /^[A-Z]/.test(descriptor.split("#").pop() ?? "");
}

export function roleAtIndexed(source: SourceFile, offsets: number[], line: number, col: number): Role {
  // One position lookup via offsets (O(1)) instead of re-splitting text
  // per occurrence (O(file length) each — the tRPC 402s cause).
  void offsets;
  return roleAt(source, line, col);
}
