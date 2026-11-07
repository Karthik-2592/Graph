"use server";

import { parseRepository } from "@/lib/parser/index";
import { validateParseResult } from "@/lib/parser/contract";
import type { ParseResult } from "@/lib/parser/types";
import { deleteAnalysis, loadAnalysis, saveAnalysis } from "@/lib/store/sqlite";

export type ParseState =
  | { ok: true; id: string; result: ParseResult }
  | { ok: false; error: string };

// Parses a directory that already exists on this machine, synchronously, in
// this process, and stores the result in the local SQLite file. Nothing is
// fetched or sent anywhere; the result is handed back to the page that
// asked for it, and a copy lives in .graph/graph.db so it can be
// reopened later without parsing again.
export async function parseLocalRepository(_previous: ParseState | null, form: FormData): Promise<ParseState> {
  const raw = form.get("path");
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, error: "Enter a local directory path" };
  try {
    // Through the parser's own contract, so what the map draws is checked the
    // same way a parser output file is.
    const result = validateParseResult(parseRepository(raw.trim()));
    const id = saveAnalysis(result);
    return { ok: true, id, result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export type LoadState = { ok: true; result: ParseResult } | { ok: false; error: string };

export async function loadSavedAnalysis(id: string): Promise<LoadState> {
  try {
    const result = loadAnalysis(id);
    return result ? { ok: true, result } : { ok: false, error: "That saved parse is no longer in the local database" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function deleteSavedAnalysis(id: string): Promise<{ ok: boolean }> {
  return { ok: deleteAnalysis(id) };
}
