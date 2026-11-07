// graph.config.json (plan §9) — strictly validated, fail loudly.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

export type GraphConfig = {
  mode: "lenient" | "strict";
  languages: string[];
  entryPoints: string[];
  exclude: string[];
  sanctioned: { "route.contract"?: string; "route.call"?: string; "route.register"?: string; "event.bus"?: string };
  allowSideEffectImports: string[];
  declarations: string;
};

const DEFAULTS: GraphConfig = { mode: "lenient", languages: ["typescript"], entryPoints: [], exclude: ["**/node_modules/**", "**/dist/**"], sanctioned: {}, allowSideEffectImports: [], declarations: "graph.declarations.json" };

export function loadConfig(root: string): GraphConfig {
  const p = path.join(root, "graph.config.json");
  if (!existsSync(p)) return { ...DEFAULTS };
  const raw = JSON.parse(readFileSync(p, "utf8"));
  if (raw.mode !== undefined && !["lenient", "strict"].includes(raw.mode)) throw new Error(`graph.config.json: mode must be lenient|strict, got ${JSON.stringify(raw.mode)}`);
  return { ...DEFAULTS, ...raw };
}
