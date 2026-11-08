// roleAt via ts-morph (Task 07): replace the prototype text heuristic
// ("next token is `(`") with AST classification.
import { Project, Node, SyntaxKind, type SourceFile } from "ts-morph";
import type { Role } from "./symbols.ts";

export type ScopeSpan = { start: number; end: number; nodeId: string; kind: "property-function" | "module-init" };

/** Classify the token at (line, col) — call | new | jsx | decorator | reference | type. */
export function roleAt(source: SourceFile, line: number, col: number): Role {
  // getFullText (not getText, which drops leading trivia and shifts lines).
  const pos = source.getFullText().split("\n").slice(0, line).reduce((acc, l) => acc + l.length + 1, 0) + col;
  // Smallest descendant containing pos (ts-morph has no getNodeAtPos).
  let node: import("ts-morph").Node | undefined;
  let bestLen = Infinity;
  for (const d of source.getDescendants()) {
    if (d.getStart() <= pos && pos < d.getEnd() && d.getEnd() - d.getStart() < bestLen) { bestLen = d.getEnd() - d.getStart(); node = d; }
  }
  if (!node) return "reference";
  if (node.getFirstAncestorByKind(SyntaxKind.JsxOpeningElement) || node.getFirstAncestorByKind(SyntaxKind.JsxSelfClosingElement) || node.getFirstAncestorByKind(SyntaxKind.JsxExpression)) {
    // JSX tag name or member inside JSX
    if (node.getText().length > 0 && /[A-Z]/.test(node.getText()[0])) return "jsx";
  }
  // Only the callee position is a call — bare arguments are references.
  if (Node.isCallExpression(node) && node.getExpression() === node) return "call";
  const p0 = node.getParent();
  if (p0 && Node.isCallExpression(p0) && p0.getExpression() === node) return "call";
  if (Node.isNewExpression(node) || Node.isNewExpression(node.getParent() ?? node)) return "new";
  if (node.getFirstAncestorByKind(SyntaxKind.Decorator)) return "decorator";
  // Field access / property reads are references, not calls — this was the
  // false-edge source in Task 06 (store.users.get etc. counted as calls).
  const parent = node.getParent();
  if (parent && Node.isPropertyAccessExpression(parent) && parent.getNameNode() === node) {
    // `this.svc.findById()` is a call; `this.svc` alone is a reference.
    const gp = parent.getParent();
    if (gp && Node.isCallExpression(gp) && gp.getExpression() === parent) return "call";
    return "reference";
  }
  if (parent && Node.isElementAccessExpression(parent)) return "reference";
  return "reference";
}

/** Arrow-function class properties, field initialisers, top-level code.
 *  Returns line ranges (startLine/endLine) to match SCIP occurrence ranges. */
export function refineScopes(source: SourceFile, fileId: string): ScopeSpan[] {
  const spans: ScopeSpan[] = [];
  const lineOf = (pos: number) => source.getFullText().slice(0, pos).split("\n").length - 1;
  for (const cls of source.getDescendantsOfKind(SyntaxKind.ClassDeclaration)) {
    for (const member of cls.getMembers()) {
      if (Node.isPropertyDeclaration(member)) {
        const name = member.getName();
        const init = member.getInitializer();
        if (init) { // any field initializer (D9), not just arrow functions
          spans.push({ start: lineOf(member.getStart()), end: lineOf(member.getEnd()), nodeId: `${fileId}::${cls.getName() ?? "Class"}#${name}.`, kind: "property-function" });
        }
      }
    }
  }
  // Top-level executable statements (not class/function declarations,
  // whose bodies have their own SCIP enclosing ranges) → module-init.
  // Each such statement gets its own span so methods inside classes are untouched.
  for (const s of source.getStatements()) {
    if (Node.isImportDeclaration(s) || Node.isExportDeclaration(s)) continue;
    if (Node.isClassDeclaration(s) || Node.isFunctionDeclaration(s) || Node.isInterfaceDeclaration(s) || Node.isTypeAliasDeclaration(s) || Node.isEnumDeclaration(s)) continue;
    spans.push({ start: lineOf(s.getStart()), end: lineOf(s.getEnd()), nodeId: `${fileId}::<module-init>`, kind: "module-init" });
  }
  return spans;
}

export function makeRoleAt(project: Project) {
  return (file: string, line: number, col: number): Role => {
    const sf = project.getSourceFile(file) ?? project.addSourceFileAtPath(file);
    return roleAt(sf, line, col);
  };
}
