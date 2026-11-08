"use client";

import type { Coverage } from "@/lib/parser/types";

// Coverage panel (Task 13): what was parsed, what was skipped and why,
// every unresolved import — click through to source locations.
export function CoveragePanel({ coverage, onReveal }: { coverage: Coverage; onReveal: (path: string) => void }) {
  const { files, imports } = coverage;
  const total = imports.total;
  return (
    <div className="absolute inset-0 overflow-auto bg-surface p-3 text-[12px]">
      <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-fg-muted">Coverage</h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        <dt className="text-fg-muted">Files found</dt><dd className="text-right tabular-nums">{files.found}</dd>
        <dt className="text-fg-muted">Parsed</dt><dd className="text-right tabular-nums">{files.parsed}</dd>
        <dt className="text-fg-muted">Skipped</dt><dd className="text-right tabular-nums">{files.skipped}</dd>
        <dt className="text-fg-muted">Imports seen</dt><dd className="text-right tabular-nums">{total.seen}</dd>
        <dt className="text-fg-muted">Internal</dt><dd className="text-right tabular-nums">{total.internal}</dd>
        <dt className="text-fg-muted">External</dt><dd className="text-right tabular-nums">{total.external}</dd>
        <dt className="text-fg-muted">Unresolved</dt><dd className="text-right tabular-nums">{total.unresolved}</dd>
      </dl>
      {imports.unresolved.length > 0 && (
        <>
          <h3 className="mb-1 mt-4 font-mono text-[11px] uppercase tracking-wide text-fg-muted">Unresolved imports ({imports.unresolved.length})</h3>
          <ul className="space-y-1">
            {imports.unresolved.map((u, i) => (
              <li key={i} className="flex gap-2">
                <button type="button" className="truncate text-left font-mono text-accent hover:underline" onClick={() => onReveal(u.from)}>{u.from}:{u.line}</button>
                <span className="truncate text-fg-muted">{u.specifier} — {u.reason}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {files.skippedFiles.length > 0 && (
        <>
          <h3 className="mb-1 mt-4 font-mono text-[11px] uppercase tracking-wide text-fg-muted">Skipped files ({files.skippedFiles.length})</h3>
          <ul className="space-y-1">
            {files.skippedFiles.map((f) => (
              <li key={f.path} className="flex gap-2"><span className="truncate font-mono">{f.path}</span><span className="text-fg-muted">{f.reason}</span></li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
