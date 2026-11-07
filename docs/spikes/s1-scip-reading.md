# Spike S1 — How to read SCIP

**Date:** 2026-11-08 · **Machine:** Windows 11, Node v26.8.2
**Tools:** `@sourcegraph/scip-typescript@0.6.1`, `@scip-code/scip@0.10.0`, `@bufbuild/protobuf@2.17.0`

## Options

| Option | Availability on Windows | Size / speed | Verdict |
|---|---|---|---|
| `scip print --json` (experiments path) | **No Windows binary.** `scip-code/scip` releases (v0.10.0, latest) ship only `darwin-amd64/arm64` and `linux-amd64/arm64` tarballs. CLI unusable on this machine without WSL. | JSON is several × the binary size; experiments noted it as "large and slow" (plan §3). | **Rejected** — cannot be a hard dependency on Windows |
| Generated protobuf bindings `@scip-code/scip` + `@bufbuild/protobuf` | npm, ESM, maintained by scip-code (same org as the proto). Pin `0.10.0` to match `scip` v0.10.0. | Measured below | **Chosen** |
| Hand-rolled protobuf decode | Always available | — | Rejected — what the bindings exist for |

## Measurements (this machine)

| Index | Binary size | Parse time | Documents | Occurrences | Definitions |
|---|---|---|---|---|---|
| This repo (`graph-repo`) | 1,153,738 B | **23 ms** | 51 | 13,964 | 2,548 |
| `graph-experiments/indexes/graph-repo.scip` (golden) | 1,115,516 B | 23 ms | 48 | 13,454 | 2,477 |
| `fixtures/shop` (Task 01) | 59,655 B | 2 ms | 26 | 536 | 163 |

Reproduce: `node spike-s1.ts <index.scip>` (script committed with this spike).
Parse time is noise next to the ~5 s indexing time (S2), so the
reading technology is not a performance risk at any realistic repo size.

## Decision

**Use `@scip-code/scip` (generated bindings) + `@bufbuild/protobuf`
`fromBinary(IndexSchema, bytes)`.** Pin both: `@scip-code/scip@0.10.0`,
`@bufbuild/protobuf@^2`. This is also the only option that works on
Windows without WSL, which S4 shows is already a constraint.

Note: `fromBinary` loads the whole index into memory. For a 154 kLOC
repo (excalidraw-scale) expect ~10–30 MB indexes — fine. If indexes
grow past ~100 MB, revisit streaming (`ParseStreaming` in the proto).
