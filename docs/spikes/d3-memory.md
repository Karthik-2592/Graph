# D3 — Memory decision

tRPC ingest peaked near 1 GB. SCIP `Index` messages support streaming
(`ParseStreaming`), but the TypeScript bindings (S1) load whole indexes
via `fromBinary`. Decision: stay with whole-index loading until a
measured repo exceeds a stated 2 GB ceiling; the D2 benchmark records
peak RSS per run so the trigger is data-driven, not speculative.
