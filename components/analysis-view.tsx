"use client";

import { useCallback, useMemo, useState } from "react";
import { foldDirectories } from "@/lib/graph/fold";
import { buildHierarchy } from "@/lib/graph/hierarchy";
import type { Selection } from "@/lib/graph/highlight";
import { adjacency, reach, type Direction } from "@/lib/graph/reach";
import { clampOffset, groupId, MAX_ROWS, rankGroupFiles } from "@/lib/graph/view";
import type { Coverage, Edge, ParsedFile, Route } from "@/lib/parser/types";
import { CategoryRail } from "./category-rail";
import { CoveragePanel } from "./coverage-panel";
import { DetailPane, type RepositoryFacts } from "./detail-pane";
import { DependencyMap } from "./map/dependency-map";
import { RouteTable } from "./route-table";
import { Shell } from "./shell";

// Owns what the map, the rail and the pane share: which folders are open,
// what's selected, what's hovered, which category is picked. Everything
// either side shows is derived from the parse output already in the browser,
// so nothing here makes a request at all.
export function AnalysisView({
  files,
  edges,
  routes,
  routeCoverage,
  coverage,
  repository,
}: {
  files: ParsedFile[];
  edges: Edge[];
  routes: Route[];
  routeCoverage: Coverage["routes"];
  coverage: Coverage;
  repository: Omit<RepositoryFacts, "routes">;
}) {
  const [level, setLevel] = useState<"folded" | "all">("folded");
  const folding = useMemo(() => {
    if (level === "all") {
      // No global cap: every directory its own group (hierarchy built from paths).
      const h = buildHierarchy(files.map((f) => f.path));
      const groups: { dir: string; files: string[] }[] = [];
      const walk = (n: typeof h) => { if (n.files.length > 0) groups.push({ dir: n.dir, files: n.files }); n.children.forEach(walk); };
      walk(h);
      const groupOf = new Map<string, string>();
      for (const g of groups) for (const f of g.files) groupOf.set(f, g.dir);
      return { threshold: 0, groups, groupOf };
    }
    return foldDirectories(files);
  }, [files, level]);
  const byPath = useMemo(() => new Map(files.map((f) => [f.path, f])), [files]);
  const [open, setOpen] = useState<ReadonlyMap<string, number>>(() => new Map());
  const [refit, setRefit] = useState(0);
  const [selection, setSelection] = useState<Selection>(null);
  const [hover, setHover] = useState<Selection>(null);
  // Held here rather than in the pane so it outlives every change of selection.
  const [walk, setWalk] = useState<Direction | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  // The centre column shows the map, route table, coverage, or call flow.
  const [centre, setCentre] = useState<"map" | "routes" | "coverage" | "flow">("map");
  // Call-flow mode: entry point + depth, expanded with reach() arithmetic.
  const [flowEntry, setFlowEntry] = useState<string>("");
  const [flowDepth, setFlowDepth] = useState(2);
  const graph = useMemo(() => adjacency(edges), [edges]);
  const flowResult = useMemo(() => {
    if (!flowEntry) return null;
    return reach(graph, flowEntry, "dependencies", flowDepth);
  }, [graph, flowEntry, flowDepth]);
  const entryPoints = useMemo(() => {
    const fromRoutes = [...new Set(routes.map((r) => r.file))].sort();
    const mains = files.filter((f) => /main|index|app|server/.test(f.path)).map((f) => f.path).sort();
    return [...new Set([...fromRoutes, ...mains])];
  }, [routes, files]);

  const toggleCategory = useCallback((c: string) => setCategory((prev) => (prev === c ? null : c)), []);

  // Clicking a folded node is the one click it has, so opening it also selects
  // the panel it becomes.
  const openGroup = useCallback((id: string) => {
    setOpen((prev) => new Map(prev).set(id, 0));
    setRefit((n) => n + 1);
    setSelection({ kind: "group", id });
  }, []);

  const closeGroup = useCallback(
    (id: string) => {
      setOpen((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      // A selection inside a folded-away panel has nothing left to point at.
      setSelection((prev) => {
        if (prev?.kind === "group") return prev.id === id ? null : prev;
        if (prev?.kind === "file") {
          const dir = folding.groupOf.get(prev.path);
          return dir !== undefined && groupId(dir) === id ? null : prev;
        }
        return prev;
      });
    },
    [folding],
  );

  const toggleFile = useCallback((path: string) => {
    setSelection((prev) => (prev?.kind === "file" && prev.path === path ? null : { kind: "file", path }));
  }, []);

  const scroll = useCallback((id: string, offset: number) => {
    setOpen((prev) => (prev.has(id) ? new Map(prev).set(id, Math.max(0, offset)) : prev));
  }, []);

  // A path clicked in the pane becomes the selection on the map, and the map
  // shows it: its folder opens if it's folded, and scrolls if the row is
  // outside the window. A folder that's already showing the row stays put.
  const reveal = useCallback(
    (path: string) => {
      const dir = folding.groupOf.get(path);
      const group = folding.groups.find((g) => g.dir === dir);
      if (dir === undefined || !group) return;
      const id = groupId(dir);
      const ranked = rankGroupFiles(group, byPath);
      const index = ranked.indexOf(path);
      const current = open.get(id);
      const first = current === undefined ? null : clampOffset(current, ranked.length);
      if (first === null || index < first || index >= first + MAX_ROWS) {
        setOpen(new Map(open).set(id, index - Math.floor(MAX_ROWS / 2)));
        if (current === undefined) setRefit((n) => n + 1);
      }
      setSelection({ kind: "file", path });
      // The row under the pointer is about to be replaced, and a removed
      // element never reports the pointer leaving it.
      setHover(null);
    },
    [folding, byPath, open],
  );

  const deselect = useCallback(() => setSelection(null), []);

  return (
    <Shell
      rail={
        <CategoryRail files={files} frameworks={repository.projects.map((p) => p.adapter)} active={category} onToggle={toggleCategory} />
      }
      map={
        <div className="absolute inset-0 flex flex-col">
          <div role="tablist" className="flex h-7 shrink-0 items-end gap-3 border-b border-line bg-surface px-3 text-[11px]">
            <CentreTab label="Map" on={centre === "map"} onClick={() => setCentre("map")} />
            <CentreTab label="Routes" count={routes.length} on={centre === "routes"} onClick={() => setCentre("routes")} />
            <CentreTab label="Coverage" count={coverage.imports.unresolved.length} on={centre === "coverage"} onClick={() => setCentre("coverage")} />
            <CentreTab label="Flow" on={centre === "flow"} onClick={() => setCentre("flow")} />
            <span className="ml-auto flex items-center gap-1 pb-1">
              <button type="button" className={level === "folded" ? "text-fg" : "text-fg-muted"} onClick={() => setLevel("folded")}>Folded</button>
              <span className="text-fg-muted">/</span>
              <button type="button" className={level === "all" ? "text-fg" : "text-fg-muted"} onClick={() => setLevel("all")}>All dirs</button>
            </span>
          </div>
          <div className="relative min-h-0 flex-1">
            {/* The map stays mounted under the table, so switching back keeps its viewport. */}
            <div className={`absolute inset-0 ${centre === "map" ? "" : "invisible"}`}>
              <DependencyMap
                files={files}
                edges={edges}
                folding={folding}
                open={open}
                selection={selection}
                hover={hover}
                refit={refit}
                category={category}
                onOpen={openGroup}
                onClose={closeGroup}
                onSelectFile={toggleFile}
                onScroll={scroll}
                onHover={setHover}
                onDeselect={deselect}
              />
            </div>
            {centre === "routes" && (
              <RouteTable
                routes={routes}
                coverage={routeCoverage}
                selection={selection}
                hover={hover}
                onReveal={reveal}
                onHover={setHover}
              />
            )}
            {centre === "coverage" && <CoveragePanel coverage={coverage} onReveal={reveal} />}
            {centre === "flow" && (
              <div className="h-full overflow-auto p-3 text-[12px]">
                <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-fg-muted">Call flow (file level)</h2>
                <div className="mb-3 flex gap-2">
                  <select aria-label="Entry point" className="rounded border border-line bg-surface px-1 py-0.5" value={flowEntry} onChange={(e) => setFlowEntry(e.target.value)}>
                    <option value="">Pick an entry point…</option>
                    {entryPoints.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <label className="flex items-center gap-1">Depth
                    <input type="number" min={1} max={5} value={flowDepth} onChange={(e) => setFlowDepth(Number(e.target.value) || 2)} className="w-12 rounded border border-line bg-surface px-1 py-0.5" />
                  </label>
                </div>
                {flowResult && flowEntry && (
                  <>
                    <p className="mb-2 text-fg-muted">{flowResult.beyond} further file(s) beyond depth {flowDepth}.</p>
                    {flowResult.steps.map((step, i) => step.length > 0 && (
                      <div key={i} className="mb-2">
                        <h3 className="font-mono text-[11px] text-fg-muted">Step {i + 1} ({step.length})</h3>
                        <ul className="space-y-0.5">{step.map((p) => <li key={p}><button type="button" className="font-mono text-accent hover:underline" onClick={() => reveal(p)}>{p}</button></li>)}</ul>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      }
      detail={
        <DetailPane
          files={files}
          byPath={byPath}
          edges={edges}
          folding={folding}
          repository={{ ...repository, routes: routes.length }}
          selection={selection}
          hover={hover}
          walk={walk}
          onWalk={setWalk}
          insightsOpen={insightsOpen}
          onInsightsOpen={setInsightsOpen}
          onReveal={reveal}
          onHover={setHover}
        />
      }
    />
  );
}

function CentreTab({ label, count, on, onClick }: { label: string; count?: number; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={`-mb-px border-b pb-1.5 ${on ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg"}`}
    >
      {label}
      {count !== undefined && <span className="ml-1 text-fg-muted tabular-nums">{count}</span>}
    </button>
  );
}
