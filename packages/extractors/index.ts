// Extractors (plan §7 Phase 4): events + routes/contract via sanctioned
// primitives from graph.config.json. Event/route nodes are first-class.
import type { NodeRow, EdgeRow, SiteRow } from "../core/store.ts";
import { symbolId } from "../core/ids.ts";

export type Sanctioned = { "route.contract"?: string; "route.call"?: string; "route.register"?: string; "event.bus"?: string };

/** Port of graph-experiments/scripts/dyn.py extractors (11–17 lines each). */

export function extractEvents(occurrences: { file: string; line: number; target: string; literalName: string | null; enclosing: string }[], busSuffix = "Bus#"): { nodes: NodeRow[]; edges: EdgeRow[]; sites: SiteRow[] } {
  const emits = new Map<string, Set<string>>(), ons = new Map<string, Set<string>>();
  const sites: SiteRow[] = [];
  for (const o of occurrences) {
    if (!o.target.endsWith(`${busSuffix}emit().`) && !o.target.endsWith(`${busSuffix}on().`)) continue;
    if (!o.literalName) { sites.push({ kind: "event-emit", status: "unrecognized", path: o.file, line: o.line, reason: "event name is not a literal" }); continue; }
    const map = o.target.endsWith("emit().") ? emits : ons;
    if (!map.has(o.literalName)) map.set(o.literalName, new Set());
    map.get(o.literalName)!.add(o.enclosing);
  }
  const nodes: NodeRow[] = [], edges: EdgeRow[] = [];
  for (const [name, emitters] of emits) {
    const eventId = symbolId("events", `${name}`);
    nodes.push({ id: eventId, kind: "event", name, attrs: { provenance: "extractor:events" } });
    for (const e of emitters) edges.push({ src: e, dst: eventId, kind: "emits", provenance: "extractor:events" });
    for (const h of ons.get(name) ?? []) edges.push({ src: eventId, dst: h, kind: "handles", provenance: "extractor:events" });
  }
  return { nodes, edges, sites };
}

export function extractContract(client: { routeSymbol: string; enclosing: string }[], server: { routeSymbol: string; handler: string }[]): { nodes: NodeRow[]; edges: EdgeRow[] } {
  const byRoute = new Map<string, { clients: Set<string>; handlers: Set<string> }>();
  for (const c of client) { if (!byRoute.has(c.routeSymbol)) byRoute.set(c.routeSymbol, { clients: new Set(), handlers: new Set() }); byRoute.get(c.routeSymbol)!.clients.add(c.enclosing); }
  for (const s of server) { if (!byRoute.has(s.routeSymbol)) byRoute.set(s.routeSymbol, { clients: new Set(), handlers: new Set() }); byRoute.get(s.routeSymbol)!.handlers.add(s.handler); }
  const nodes: NodeRow[] = [], edges: EdgeRow[] = [];
  for (const [route, { clients, handlers }] of byRoute) {
    const routeId = symbolId("routes", route);
    nodes.push({ id: routeId, kind: "route", name: route, attrs: { provenance: "extractor:routes" } });
    for (const c of clients) edges.push({ src: c, dst: routeId, kind: "requests", provenance: "extractor:routes" });
    for (const h of handlers) edges.push({ src: routeId, dst: h, kind: "serves", provenance: "extractor:routes" });
  }
  return { nodes, edges };
}
