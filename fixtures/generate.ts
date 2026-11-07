// Port of graph-experiments/fixtures/gen_shop.sh + gen_shop2_dynamic.sh
// to a Windows-compatible Node script (type-stripping, `.ts` suffixes).
// Usage: node fixtures/generate.ts [targetDir]
// Writes `shop` by default; `--strict` also writes `shop-strict`.
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const experiments = path.join(root, "graph-experiments");

export function extractHeredocs(shell: string): { path: string; content: string }[] {
  const out: { path: string; content: string }[] = [];
  const re = /cat > (\S+) <<'EOF'\n([\s\S]*?)\nEOF/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(shell))) out.push({ path: m[1], content: m[2] + "\n" });
  return out;
}

export function writeFiles(base: string, files: { path: string; content: string }[]) {
  for (const f of files) {
    const dest = path.join(base, f.path);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, f.content, "utf8");
  }
}

/** Apply the shop2-dynamic mutations (events + handler tables + contract) exactly as gen_shop2_dynamic.sh does. */
export function applyDynamic(files: { path: string; content: string }[]): { path: string; content: string }[] {
  const extra = extractHeredocs(readFileSync(path.join(experiments, "fixtures/gen_shop2_dynamic.sh"), "utf8"));
  const byPath = new Map(files.map((f) => [f.path, f.content]));
  for (const f of extra) byPath.set(f.path, f.content);
  const get = (p: string) => byPath.get(p)!;
  const set = (p: string, c: string) => byPath.set(p, c);
  // orderService: import bus, emit literal, add replay() non-literal site
  let s = get("backend/src/services/orderService.ts");
  s = s.replace("import { UserService }", 'import { bus } from "../events";\nimport { UserService }');
  s = s.replace(
    "    return { user: u.name, total, display: formatMoney(total) };",
    '    bus.emit("orderPlaced", { total });\n    return { user: u.name, total, display: formatMoney(total) };\n  }\n  replay(k: "orderPlaced" | "userRenamed") {\n    bus.emit(k as any, {} as any);',
  );
  set("backend/src/services/orderService.ts", s);
  // userService: emit literal
  let u = get("backend/src/services/userService.ts");
  u = u.replace("import { NotFound }", 'import { bus } from "../events";\nimport { NotFound }');
  u = u.replace("    const u = this.findById(id);\n    return this.repo.save", '    const u = this.findById(id);\n    bus.emit("userRenamed", { id });\n    return this.repo.save');
  set("backend/src/services/userService.ts", u);
  // index: side-effect import of notifier
  set("backend/src/index.ts", 'import "./notifier";\n' + get("backend/src/index.ts"));
  return [...byPath.entries()].map(([p, content]) => ({ path: p, content })).sort((a, b) => a.path.localeCompare(b.path));
}

/** Make shop-strict pass R1–R6: shop2-dynamic minus non-literal replay,
 *  minus loose dispatch, raw fetch client replaced by contract, and
 *  backend routes registered only via sanctioned `register`. */
export function applyStrict(files: { path: string; content: string }[]): { path: string; content: string }[] {
  const byPath = new Map(files.map((f) => [f.path, f.content]));
  const get = (p: string) => byPath.get(p)!;
  const set = (p: string, c: string) => byPath.set(p, c);
  // Remove the non-literal emit site (replay)
  set("backend/src/services/orderService.ts", get("backend/src/services/orderService.ts").replace(
    '\n  }\n  replay(k: "orderPlaced" | "userRenamed") {\n    bus.emit(k as any, {} as any);',
    "\n  }",
  ));
  // Remove loose (string-keyed, cast) dispatch — only typed dispatch remains
  set("backend/src/commands.ts", get("backend/src/commands.ts").replace(
    'export function dispatchLoose(name: string, arg: string) { return (handlers as Record<string, (a: string) => unknown>)[name](arg); }\n',
    "",
  ));
  // Frontend: replace raw-fetch client with the sanctioned contract client.
  // The old client.ts stays only as documentation of what NOT to do — strict
  // fixture deletes it so no raw fetch exists outside shared/http.ts.
  byPath.delete("frontend/src/api/client.ts");
  set("frontend/src/api/client.ts", 'export { getUserViaContract as getUser } from "./contract";\nexport { placeOrderViaContract as placeOrder } from "./contract2";\n');
  set("frontend/src/api/contract2.ts", 'import { routes } from "../../../shared/routes";\nimport { callApi } from "../../../shared/http";\nimport type { OrderDTO, Item } from "../../../shared/DTOs";\nexport function placeOrderViaContract(items: Item[]) { return callApi<OrderDTO>(routes.placeOrder, {}); }\n');
  // Backend: routes registered only via sanctioned register()
  set("backend/src/routes/index.ts", [
    'import { Router } from "express";',
    'import { routes } from "../../../shared/routes";',
    'import { register } from "./contract";',
    'import { requireAuth } from "../middleware/auth";',
    'import { UserController } from "../controllers/userController";',
    'import { OrderController } from "../controllers/orderController";',
    'export function buildRouter(users: UserController, orders: OrderController) {',
    '  const r = Router();',
    '  register(r, routes.getUser, requireAuth, users.get);',
    '  register(r, routes.placeOrder, requireAuth, orders.place.bind(orders));',
    '  return r;',
    '}',
    "",
  ].join("\n"));
  return [...byPath.entries()].map(([p, content]) => ({ path: p, content })).sort((a, b) => a.path.localeCompare(b.path));
}

function main() {
  const wantStrict = process.argv.includes("--strict");
  const base = process.argv.find((a) => !a.startsWith("-") && a !== process.argv[0] && a !== process.argv[1]) ?? path.join(__dirname, "shop");
  const target = path.isAbsolute(base) ? base : path.join(__dirname, base);
  const shell = readFileSync(path.join(experiments, "fixtures/gen_shop.sh"), "utf8");
  let files = extractHeredocs(shell);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  writeFiles(target, files);
  console.log(`wrote ${files.length} files to ${target}`);
  if (wantStrict) {
    const strictDir = path.join(__dirname, "shop-strict");
    if (existsSync(strictDir)) rmSync(strictDir, { recursive: true, force: true });
    mkdirSync(strictDir, { recursive: true });
    const strict = applyStrict(applyDynamic(files));
    writeFiles(strictDir, strict);
    console.log(`wrote ${strict.length} files to ${strictDir}`);
    // Also keep the dynamic variant for Task 10 testing
    const dynDir = path.join(__dirname, "shop-dynamic");
    if (existsSync(dynDir)) rmSync(dynDir, { recursive: true, force: true });
    mkdirSync(dynDir, { recursive: true });
    writeFiles(dynDir, applyDynamic(files));
    console.log(`wrote ${applyDynamic(files).length} files to ${dynDir}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
