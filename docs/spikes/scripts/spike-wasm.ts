// F5 spike: can tree-sitter WASM parse Python and find function scopes?
import { Parser, Language } from "web-tree-sitter";
import { existsSync } from "node:fs";
import path from "node:path";

await Parser.init();
const parser = new Parser();
const wasmPath = path.join(process.cwd(), "node_modules", "tree-sitter-wasms", "out", "tree-sitter-python.wasm");
if (!existsSync(wasmPath)) { console.log("SKIP: tree-sitter-python.wasm not found at", wasmPath); process.exit(0); }
const lang = await Language.load(wasmPath);
parser.setLanguage(lang);

const tree = parser.parse("def checkout():\n    helper()\ndef helper():\n    pass\n");
console.log("root:", tree.rootNode.type, "children:", tree.rootNode.childCount);

const query = lang.query(`(function_definition name: (identifier) @name)`);
const matches = query.matches(tree.rootNode);
let found = 0;
for (const match of matches) {
  const name = match.captures.find((c: any) => c.name === "name")?.node.text;
  console.log(" function:", name);
  found++;
  if (found >= 5) break;
}
console.log(`found ${found} function definitions — WASM spike ${found >= 2 ? "VIABLE" : "FAILED"}`);
