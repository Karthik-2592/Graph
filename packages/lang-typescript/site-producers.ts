// Site producers (E3): each emits sites with recognized|unrecognized|declared.
import type { SiteRow } from "../core/store.ts";
import { Project, Node, SyntaxKind } from "ts-morph";

export function produceSites(source: import("ts-morph").SourceFile, file: string, opts: { allowSideEffect?: string[]; sanctionedClient?: string } = {}): SiteRow[] {
  const sites: SiteRow[] = [];
  const allow = opts.allowSideEffect ?? [];
  for (const stmt of source.getStatements()) {
    if (Node.isImportDeclaration(stmt) && stmt.getImportClause() === undefined) {
      const spec = stmt.getModuleSpecifierValue();
      if (!allow.some((a) => spec.endsWith(a) || spec === a)) sites.push({ kind: "side-effect-import", status: "unrecognized", path: file, line: stmt.getStartLineNumber(), reason: "side-effect registration import" });
    }
  }
  for (const call of source.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callee = call.getExpression();
    const line = call.getStartLineNumber();
    if (callee.getKind() === SyntaxKind.ImportKeyword) {
      const arg = call.getArguments()[0];
      if (!arg || !(Node.isStringLiteral(arg) || Node.isNoSubstitutionTemplateLiteral(arg))) sites.push({ kind: "dynamic-import", status: "unrecognized", path: file, line, reason: "non-literal import()" });
    }
    if (Node.isIdentifier(callee) && callee.getText() === "require") {
      const arg = call.getArguments()[0];
      if (!arg || !Node.isStringLiteral(arg)) sites.push({ kind: "dynamic-import", status: "unrecognized", path: file, line, reason: "non-literal require()" });
    }
    if (Node.isIdentifier(callee) && callee.getText() === "fetch" && opts.sanctionedClient !== file) {
      sites.push({ kind: "network-call", status: "unrecognized", path: file, line, reason: "raw fetch outside sanctioned client" });
    }
    // Non-literal event emit (G6) — emits are producers' job via Bus#emit
    if (Node.isPropertyAccessExpression(callee) && callee.getName() === "emit") {
      const arg = call.getArguments()[0];
      if (arg && !Node.isStringLiteral(arg)) sites.push({ kind: "event-emit", status: "unrecognized", path: file, line, reason: "non-literal event name" });
    }
  }
  return sites;
}

export function fileOutsideProgram(walkList: string[], indexDocs: string[]): SiteRow[] {
  const inIndex = new Set(indexDocs);
  return walkList.filter((f) => !inIndex.has(f)).map((f) => ({ kind: "file-outside-program", status: "unrecognized", path: f, reason: "walked but not in index program" }));
}
export function staleDeclarations(decls: { from: string }[], exists: (id: string) => boolean): SiteRow[] {
  return decls.filter((d) => !exists(d.from)).map((d) => ({ kind: "stale-declaration", status: "unrecognized", path: d.from, reason: "declaration endpoint missing (G8)" }));
}
export function newProject() { return new Project({ useInMemoryFileSystem: true }); }
