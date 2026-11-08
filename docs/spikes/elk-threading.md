# ELK threading measurement (G2)

**Date:** 2026-11-08 · **Build:** elk.bundled (main thread), per
`docs/spikes/viewer-stack.md`

## Measured (from spike ladder)

| Nodes | ELK time |
|---|---|
| 500 | 2.9 s |
| 1,000 | 4.1 s |
| 3,000 | 23.4 s |

## Decision

Main-thread ELK is acceptable **only for neighbourhoods** (≤ hundreds
of nodes, <1s). Full-graph layout stays on the server CLI (Task 15) or
behind the dagre fallback in the canvas. A worker would need
`elkjs/lib/elk-worker` + a bundler-visible worker URL — Turbopack
cannot resolve `web-worker` today (same failure that forced
`elk.bundled`). Revisit when a worker entry is bundleable; the
async dagre→ELK upgrade in `dependency-map.tsx` already isolates the
swap.
