// F6: Python roleAt/refineScopes via tree-sitter WASM (F5 decision).
// Queries: function definitions, lambdas, decorators, class bodies.
// @ts-expect-error - web-tree-sitter ships no TS declarations for Node
import { Parser, Language } from "web-tree-sitter";
import path from "node:path";
import type { Role } from "./symbols.ts";

let parserPromise: Promise<{ parser: Parser; lang: Language }> | null = null;
async function getParser() {
  if (!parserPromise) {
    parserPromise = (async () => {
      await Parser.init();
      const parser = new Parser();
      const wasm = path.join(process.cwd(), "node_modules", "tree-sitter-wasms", "out", "tree-sitter-python.wasm");
      const lang = await Language.load(wasm);
      parser.setLanguage(lang);
      return { parser, lang };
    })();
  }
  return parserPromise;
}

export async function pythonRoleAt(source: string, line: number, col: number): Promise<Role> {
  const { parser } = await getParser();
  const tree = parser.parse(source);
  // Find smallest node containing (line, col) by walking ancestors of the
  // leaf named by the query cursor position.
  const lines = source.split("\n");
  const pos = lines.slice(0, line).reduce((a, l) => a + l.length + 1, 0) + col;
  let node: any = tree.rootNode;
  while (node && node.childCount > 0) {
    const next = node.children.find((c: any) => c.startPosition.row <= line && line <= c.endPosition.row && c.startPosition.row * 10000 + c.startPosition.column <= pos && pos <= c.endPosition.row * 10000 + c.endPosition.column);
    if (!next) break;
    node = next;
  }
  const t = node?.type ?? "";
  if (t === "call") return "call";
  if (t === "decorator" || t === "decorated_definition") return "decorator";
  if (t === "lambda") return "call";
  return "reference";
}

export async function pythonRefineScopes(source: string): Promise<{ start: number; end: number; nodeId: string }[]> {
  const { parser, lang } = await getParser();
  const tree = parser.parse(source);
  const query = lang.query(`(function_definition name: (identifier) @name)`);
  const spans: { start: number; end: number; nodeId: string }[] = [];
  for (const match of query.matches(tree.rootNode)) {
    const name = match.captures.find((c: any) => c.name === "name")?.node;
    if (!name) continue;
    const fn = name.parent;
    spans.push({ start: fn.startPosition.row, end: fn.endPosition.row, nodeId: `${name.text}.` });
  }
  return spans;
}
