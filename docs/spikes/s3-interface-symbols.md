# Spike S3 — Interface / implementation signals in SCIP

**Date:** 2026-11-08 · **Source:** `scip.proto` (scip-code/scip v0.10.0),
read directly — no indexer run needed because the question is about
the protocol, and the protocol text answers it completely.

## Findings

1. **Symbol kinds exist for interfaces and abstract methods.**
   `Kind` enum: `Interface = 21`, `AbstractMethod = 66`
   ("a method which may or may not have a body"), `Method = 26`,
   `Class = 7`. `SymbolInformation.kind` (field 5) is the recommended
   way to tell whether a symbol is "a class or a method" — the proto
   explicitly says to use it "instead of `SymbolDescriptor.Suffix`".

2. **Implementation relationships exist.** `SymbolInformation.relationships`
   is `repeated Relationship`, and `Relationship` has:
   - `is_reference` — "Find references" linkage
   - `is_implementation` — "Find implementations" linkage

   The proto's own worked example is TypeScript:
   `class Dog implements Animal { ... Dog#sound(), relationships =
   [{symbol: "Animal#sound()", is_implementation: true, is_reference: true}] }`.
   "It's common for `is_implementation` and `is_reference` to both be
   true but it's not always the case."

3. **No `SymbolRole` bit for interface/implementation** (roles are:
   Definition, Import, WriteAccess, ReadAccess, Generated, Test,
   ForwardDefinition). Dispatch detection therefore goes through
   `kind` + `relationships`, not roles.

## Decision for Task 11 (declarations / dispatch sites)

- **Lenient mode can auto-expand**: a call whose target symbol has
  `kind = AbstractMethod` (or whose definition's kind is `Interface`)
  may be expanded into `may` edges to every symbol related by
  `is_implementation` (transitively via `is_reference` where set).
- **Strict mode requires an explicit declaration** (G7) instead of
  auto-expansion — same trust boundary as plan §8.4.
- Caveat: whether `scip-typescript` actually *populates*
  `relationships` for TS interfaces must still be verified against a
  real indexed fixture (the proto allows indexers to omit it). That
  check is a Task 06 test, not a spike blocker — if the field is
  empty in practice, lenient mode records the site and strict mode
  requires declarations, exactly as the plan's fallback says.
