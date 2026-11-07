# Spike S4 — pnpm workspaces and project references

**Date:** 2026-11-08 · **Machine:** Windows 11, Node v26.8.2
**Tool:** `@sourcegraph/scip-typescript@0.6.1`

## pnpm workspaces (`--pnpm-workspaces`) — BROKEN on Windows

Repro: two-package workspace (`packages/a`, `packages/b` with
`"@ws/b" → "@ws/a"`), indexed with
`scip-typescript index --pnpm-workspaces --infer-tsconfig`.

Failure (both with and without `--infer-tsconfig`):

```
error: no files got indexed. To fix this problem, make sure that the
TypeScript projects ["B"] contain input files or reference other projects.
```

`["B"]` is the bug: the indexer parses `pnpm ls -r --depth -1 --long
--parseable` output and splits on something that turns
`B:\Projects\...` into `B`. Workspace discovery is unusable on
Windows (paths with backslashes and/or spaces). It also shells out to
`pnpm` (not present by default; this machine's global `pnpm` shim is
broken by spaces in the Node install path — a local `pnpm.cmd` shim
was needed just to reach the real bug).

**Implication:** do not depend on `--pnpm-workspaces` /
`--yarn-workspaces` for v1. This independently confirms decision D7
(single root program): `graph doctor` should warn when a repo has
multiple `package.json` workspaces and the tool falls back to a
tool-owned root `tsconfig` covering all packages.

## Project references — WORKS

Repro: root `tsconfig.json` with `references: [{path: ./a}, {path:
./b}]`, `b` referencing `a` (composite), `b/index.ts` importing
`hello` from `../a`.

```
+ .../shop-spike-refs/a (7ms)
+ .../shop-spike-refs/b (8ms)
done refs.scip
```

Result: 2 documents indexed, cross-package import resolved, 911-byte
index, parsed in <1 ms (S1 script). Project-reference repos need no
special handling beyond listing both projects.

## Also reproduced (both layouts)

`--infer-tsconfig` writes an empty `{}` `tsconfig.json` (2 bytes)
into the indexed repo's root — confirmed again on `fixtures/shop`.
The runner (Task 05) must delete/restore it.

## Decisions for Task 05

1. **Default to D7 single root program.** Use the repo's root
   `tsconfig` when it covers all source; otherwise write a tool-owned
   config and record files outside the program as sites
   (`file-outside-program`, G1).
2. **Do not shell out to `pnpm`/`yarn`** for workspace discovery in
   v1. Discover packages from `package.json` files (the existing
   walker already does this — `lib/parser/walk.ts`).
3. **Project references** work as-is; add a fixture with references
   to Task 06's test matrix alongside the pnpm fixture (which should
   assert the D7 fallback, not `--pnpm-workspaces`).
