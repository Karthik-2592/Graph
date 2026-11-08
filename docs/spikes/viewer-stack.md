# Viewer spike — React Flow + ELK vs Cytoscape.js vs dagre

**Date:** 2026-11-08 · **Machine:** Windows 11, Node v26.8.2
**Versions:** elkjs 0.12.1 · cytoscape 3.34.4 · @dagrejs/dagre 3.1.3

## Real call graph (graph-repo.scip, 57 nodes / 47 edges derived)

| Layout | Time |
|---|---|
| dagre (current `layout.ts`) | 18 ms |
| ELK layered | 94–112 ms |
| Cytoscape COSE compound | 46–53 ms |

At real small scale everything is instant; this only discriminates at scale.

## Scalability ladder (synthetic, bounded 30s per cell, one layout per process)

Script: `spike-viewer-scalability2.ts <algo> <n>` (edges ≈ 2n). A timeout
cell means "did not finish in 30s" — that *is* the measurement.

| Nodes | dagre | ELK layered | Cytoscape COSE compound |
|---|---|---|---|
| 500 | **2.3 s** | **2.9 s** | 12.1 s |
| 1,000 | >30 s (timeout) | **4.1 s** | >30 s (timeout) |
| 3,000 | >30 s (timeout) | **23.4 s** | >30 s (timeout) |

Cytoscape here uses bounded iterations (`maxIterations: 200`); unbounded
(the previous run) never reached `layoutstop` in ~10h on a 3k graph.
ELK's 3k cell only generated 4,068 edges (guard capped) — still the
largest completed layout by far.

## Decision

**ELK layered layout inside the existing React Flow canvas.**

- ELK is the only candidate that completes 1k–3k method-level graphs.
  23s for a full 3k layout is acceptable *because the viewer never lays
  out the full call graph*: L1 first (dagre-fast file graph), expand
  lazily per subtree, call-flow mode lays out neighbourhoods only
  (Task 13). Neighbourhoods are ≤ hundreds of nodes → <1s.
- **dagre (current stack) stays for L1** (file graph, ≤ hundreds of
  nodes, 18ms) and is replaced by ELK for L2 compound groups. The
  existing React Flow integration (`dependency-map.tsx`, measured-
  dimensions handling) is retained — no Cytoscape rewrite.
- **Cytoscape rejected**: COSE compound is 5–10× slower than ELK at
  500 nodes and times out at 1k; adopting it would mean replacing the
  whole canvas for worse scaling.

## Integration notes for Task 13

- ELK runs in a worker (it's synchronous CPU work; 23s would block the
  main thread at full-graph scale). Neighbourhood layout (<1s) can stay
  on the main thread behind the existing async layout path.
- `elk.layered.crossingMinimization.sifting.maxIterations: 5` bounds
  the longest runs; quality loss is acceptable for call graphs.
- Compound groups map to ELK `children` nesting (file → class →
  function), which dagre cannot do — this is the hierarchical folding
  the plan requires.
