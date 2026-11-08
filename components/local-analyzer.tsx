"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSavedAnalysis, loadSavedAnalysis, parseLocalRepository, type ParseState } from "@/app/actions";
import { ago } from "@/lib/time";
import type { AnalysisSummary } from "@/lib/store/sqlite";
import { AnalysisView } from "./analysis-view";
import { CollapseToggle } from "./collapsible";

// The whole app on one screen: a path to a local directory, the map of
// whatever was parsed, and a history of saved parses from the local SQLite
// file. Parsing happens in the server action; this only holds the result.
export function LocalAnalyzer({ saved }: { saved: AnalysisSummary[] }) {
  const [state, setState] = useState<ParseState | null>(null);
  const [loaded, setLoaded] = useState<ParseState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [now] = useState(() => Date.now());
  const [savedOpen, setSavedOpen] = useState(true);
  const router = useRouter();

  const busy = pending;
  const current = state?.ok ? state : loaded?.ok ? loaded : null;

  const parse = (form: FormData) =>
    startTransition(async () => {
      setLoaded(null);
      setError(null);
      const result = await parseLocalRepository(null, form);
      setState(result);
      if (result.ok) router.refresh();
    });

  const openSaved = (id: string) =>
    startTransition(async () => {
      setError(null);
      const result = await loadSavedAnalysis(id);
      if (result.ok) setLoaded({ ok: true, id, result: result.result });
      else setError(result.error);
    });

  const removeSaved = (id: string) =>
    startTransition(async () => {
      await deleteSavedAnalysis(id);
      if (loaded?.ok && loaded.id === id) setLoaded(null);
      router.refresh();
    });

  return (
    <div className="flex h-full flex-col">
      <form
        action={parse}
        className="flex h-9 shrink-0 items-center gap-2 border-b border-line bg-surface px-3"
      >
        <span className="font-mono text-xs font-semibold tracking-tight">graph</span>
        <span className="text-line">/</span>
        <input
          name="path"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="C:\path\to\repository"
          aria-label="Local repository directory"
          aria-invalid={(state && !state.ok) || error ? true : undefined}
          className="h-6 w-96 min-w-0 rounded border border-line bg-canvas px-2 font-mono text-xs outline-none placeholder:text-fg-muted focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-6 shrink-0 rounded bg-accent px-2 text-xs text-accent-fg disabled:opacity-60"
        >
          {pending ? "Parsing…" : "Parse"}
        </button>
        {(state && !state.ok) || error ? (
          <span role="alert" className="truncate text-xs text-fg">
            {state && !state.ok ? state.error : error}
          </span>
        ) : null}
      </form>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {current ? (
            <AnalysisView
              files={current.result.files}
              edges={current.result.edges}
              routes={current.result.routes}
              routeCoverage={current.result.coverage.routes}
              coverage={current.result.coverage}
              analysisId={current.id}
              repository={{
                name: current.result.root,
                projects: current.result.projects,
                skipped: current.result.coverage.files.skipped,
                unresolved: current.result.coverage.imports.unresolved.length,
              }}
            />
          ) : (
            <div className="px-3 py-10 text-xs text-fg-muted">
              <p className="text-fg">No repository parsed yet.</p>
              <p className="mt-1">
                Enter the path to a TypeScript or JavaScript project on this machine. It is parsed where it sits and saved
                to the local database — nothing is uploaded or sent anywhere.
              </p>
            </div>
          )}
        </div>

        <aside
          aria-label="Saved parses"
          className={`flex shrink-0 flex-col border-l border-line bg-surface ${savedOpen ? "w-80" : "w-6"}`}
        >
          <h2 className="flex items-center border-b border-line text-[11px] text-fg-muted">
            <CollapseToggle open={savedOpen} onToggle={() => setSavedOpen(!savedOpen)} label="Saved parses" className="h-8 w-6 shrink-0" />
            {savedOpen && <span className="min-w-0 flex-1 truncate py-2 pr-3">Saved parses · local SQLite</span>}
          </h2>
          {savedOpen && (
            <>
          {saved.length === 0 ? (
            <p className="px-3 py-3 text-[11px] text-fg-muted">Nothing saved yet. Parsed repositories appear here.</p>
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto py-1">
              {saved.map((s) => (
                <li key={s.id} className="px-3 py-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openSaved(s.id)}
                    className="block w-full text-left font-mono text-[11px] break-all hover:underline disabled:opacity-60"
                    title={s.root}
                  >
                    {s.root}
                  </button>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-fg-muted tabular-nums">
                    <span>
                      {s.fileCount} files · {s.edgeCount} edges
                    </span>
                    <time dateTime={s.updatedAt} title={s.updatedAt}>
                      {ago(s.updatedAt, now)}
                    </time>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeSaved(s.id)}
                      className="ml-auto hover:text-fg hover:underline disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
