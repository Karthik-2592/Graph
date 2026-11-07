# Spike S2 — Large-repo performance

**Date:** 2026-11-08 · **Machine:** Windows 11, Node v26.8.2
**Tool:** `@sourcegraph/scip-typescript@0.6.1` (matches experiment version)

## Measured

| Repo | Files | Wall time | Index size |
|---|---|---|---|
| `fixtures/shop` (26 code files) | 26 | **1.5 s** | 59,655 B |
| This repo (`Graph`, 48–51 docs) | ~50 | **5.2 s** | 1,153,738 B |
| Golden `graph-experiments/indexes/graph-repo.scip` | 48 | (already indexed) | 1,115,516 B |

Small-repo extrapolation: ~0.1 s per source file of this repo's
complexity (Next.js app + ts-morph). tRPC (74 kLOC) and excalidraw
(154 kLOC) were **not** re-cloned and re-indexed in this spike — they
remain unmeasured. Budget with the linear rate + 2× safety factor:

| Repo size | Budget (wall time) | Budget (index size) |
|---|---|---|
| 5 kLOC (this repo) | 10 s | 2 MB |
| 75 kLOC (tRPC-scale) | 2 min | 30 MB |
| 155 kLOC (excalidraw-scale) | 5 min | 60 MB |

## Reader cost (S1)

`fromBinary` parse: 23 ms for 1.1 MB → ~2 ms per 100 KB. Reader cost
is negligible vs indexing at every scale above.

## Recommendation for `graph doctor` thresholds

- Warn if indexing exceeds the budget row for the repo's LOC.
- Cache by commit + profile hash (already in plan §12) — with these
  numbers a full re-index per save is **not** viable; incremental
  indexing (Phase 8) stays deferred until a real user hits the budget.
- The `--infer-tsconfig` side effect (empty `{}` written to the repo
  root, reproduced here: 2-byte `tsconfig.json` in `shop-spike`)
  must be cleaned up by the runner or the user's repo is polluted.

## Next step (not done here)

Clone tRPC + excalidraw and measure for real before Phase 2 closes.
This spike's budgets are extrapolations and must be replaced by
measurements — that measurement is Task 06's test matrix, not a
blocker for starting it.
