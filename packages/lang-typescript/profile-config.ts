// H4: lint profile reads sanctioned client from graph.config.json,
// exported as a flat-config preset.
import { eslintProfile } from "./profile.ts";
import { loadConfig } from "../cli/config.ts";

export function profileFromConfig(root: string) {
  const cfg = loadConfig(root);
  const client = cfg.sanctioned["route.call"] ?? "shared/http.ts";
  return { ...eslintProfile, sanctionedClient: client };
}
