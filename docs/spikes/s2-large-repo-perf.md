# Spike S2 — Large-repo performance (updated with measured tRPC numbers)

**Updated:** 2026-11-08 (remediation D2). Previous version extrapolated.

## Measured (from remediation assessment, tRPC 936 files, 176,673 occurrences)

| Phase | Time | Notes |
|---|---|---|
| Index (`scip-typescript`) | **34 s** | Within the old 2-min budget |
| Ingest (roleAt + derivation) | **402 s** (~2.3 ms/occurrence vs 0.4 ms on shop) | **Exceeds budget** — D1 fixes the cost |
| Peak memory (ingest) | ~1 GB | D3 decision point |

## Budget (revised)

| Repo size | Index budget | Ingest budget |
|---|---|---|
| 5 kLOC | 10 s | 30 s |
| 75 kLOC (tRPC) | 1 min | 7 min (402s measured, D1 target ≤0.3ms/occ → ~55s) |
| 155 kLOC (excalidraw) | 2 min | 15 min |

Benchmark: `node scripts/bench.ts <repo>` (committed). CI runs fixtures
only. Clone-based reruns are manual (network-dependent).
