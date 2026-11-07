// roleAt via ts-morph (Task 07): replace the prototype text heuristic
// ("next token is `(`") with AST classification.
import { Project, Node, SyntaxKind, type SourceFile } from "ts-morph";
import type { Role } from "./symbols.ts";

export type ScopeSpan = { start: number; end: number; nodeId: string; kind: "property-function" | "module-init" };

/** Classify the token at (line, col) — call | new | jsx | decorator | reference | type. */
export function roleAt(source: SourceFile, line: number, col: number): Role {
  const pos = source.getText().split("\n").slice(0, line).reduce((acc, l) => acc + l.length + 1, 0) + col;
  // Smallest descendant containing pos (ts-morph has no getNodeAtPos).
  let node: import("ts-morph").Node | undefined;
  let bestLen = Infinity;
  for (const d of source.getDescendants()) {
    if (d.getStart() <= pos && pos <= d.getEnd() && d.getEnd() - d.getStart() < bestLen) { bestLen = d.getEnd() - d.getStart(); node = d; }
  }
  if (!node) return "reference";
  if (node.getFirstAncestorByKind(SyntaxKind.JsxOpeningElement) || node.getFirstAncestorByKind(SyntaxKind.JsxSelfClosingElement) || node.getFirstAncestorByKind(SyntaxKind.JsxExpression)) {
    // JSX tag name or member inside JSX
    if (node.getText().length > 0 && /[A-Z]/.test(node.getText()[0])) return "jsx";
  }
  if (Node.isCallExpression(node) || Node.isCallExpression(node.getParent() ?? node)) return "call";
  if (Node.isNewExpression(node) || Node.isNewExpression(node.getParent() ?? node)) return "new";
  if (node.getFirstAncestorByKind(SyntaxKind.Decorator)) return "decorator";
  // Field access / property reads are references, not calls — this was the
  // false-edge source in Task 06 (store.users.get etc. counted as calls).
  const parent = node.getParent();
  if (parent && Node.isPropertyAccessExpression(parent) && parent.getNameNode() === node) return "reference";
  if (parent && Node.isElementAccessExpression(parent)) return "reference";
  return "reference";
}

/** Arrow-function class properties, field initialisers, top-level code. */
export function refineScopes(source: SourceFile, fileId: string): ScopeSpan[] {
  const spans: ScopeSpan[] = [];
  for (const cls of source.getDescendantsOfKind(SyntaxKind.ClassDeclaration)) {
    for (const member of cls.getMembers()) {
      if (Node.isPropertyDeclaration(member)) {
        const name = member.getName();
        const init = member.getInitializer();
        if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
          spans.push({ start: member.getStart(), end: member.getEnd(), nodeId: `${fileId}::${cls.getName() ?? "Class"}#${name}.`, kind: "property-function" });
        }
      }
    }
  }
  // Top-level statements outside any function/class → module-init
  const topLevel = source.getStatements().filter((s) => !Node.isImportDeclaration(s) && !Node.isExportDeclaration(s));
  if (topLevel.length > 0) {
    spans.push({ start: topLevel[0].getStart(), end: topLevel[topLevel.length - 1].getEnd(), nodeId: `${fileId}::<module-init>`, kind: "module-init" });
  }
  return spans;
}

export function makeRoleAt(project: Project) {
  return (file: string, line: number, col: number): Role => {
    const sf = project.getSourceFile(file) ?? project.addSourceFileAtPath(file);
    return roleAt(sf, line, col);
  };
}
