// `graph` CLI skeleton (plan §10). Unimplemented subcommands exit non-zero.
import { loadConfig } from "./config.ts";

const COMMANDS = ["index", "check", "callers", "callees", "path", "coverage", "export", "doctor"] as const;

export function main(argv: string[]): number {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "--help" || cmd === "-h") { console.log(`graph commands: ${COMMANDS.join(", ")}`); return cmd ? 0 : 2; }
  if (!(COMMANDS as readonly string[]).includes(cmd)) { console.error(`unknown command: ${cmd}`); return 2; }
  if (cmd === "index") {
    const root = rest.find((a) => !a.startsWith("-")) ?? ".";
    const cfg = loadConfig(root);
    console.log(`index ${root} mode=${cfg.mode} languages=${cfg.languages.join(",")} (producers land in Tasks 04-06)`);
    return 0;
  }
  console.error(`graph ${cmd}: not yet implemented`);
  return 1;
}
if (process.argv[1]?.endsWith("index.ts")) process.exit(main(process.argv.slice(2)));
