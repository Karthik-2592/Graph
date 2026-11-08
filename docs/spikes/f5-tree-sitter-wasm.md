# F5 spike — tree-sitter WASM for Python roleAt/refineScopes

**Date:** 2026-11-08 · **Machine:** Windows 11, Node v26.8.2
**Packages:** `tree-sitter-wasms@0.1.13` (grammar), `web-tree-sitter@0.25.8` (runtime)

## Result: VIABLE

```
root: module children: 2
 function: checkout
 function: helper
found 2 function definitions — WASM spike VIABLE
```

Reproduce: `node spike-wasm.ts` (after `npm i tree-sitter-wasms web-tree-sitter@0.25.8`).

## Version pinning (the gotcha)

- `web-tree-sitter@0.27.2` (latest) **fails** to load the grammar:
  `getDylinkMetadata` mismatch — the wasms were built for an older
  runtime ABI.
- Pin **both**: `tree-sitter-wasms@0.1.13` + `web-tree-sitter@0.25.8`.
  `Language.query` is deprecated in 0.25.8 in favour of `new Query(...)`
  but still works.

## Decision for F6

**WASM build.** No native compile, Windows-friendly, parses Python and
answers `function_definition` queries today. F6's `roleAt`/`refineScopes`
(lambdas, decorators, class bodies) will be tree-sitter queries on this
runtime. Native `tree-sitter-python` (pip) is unnecessary.

**Grimp cross-check producer: dropped** (2026-11-08, user decision).
F6 completeness = enclosing-range callers + WASM roleAt/refineScopes +
`requests` golden.
