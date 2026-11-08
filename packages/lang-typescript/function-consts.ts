// C2: function-valued consts as call targets. One-pass AST set across
// all files; edges to them are kept, other variable targets stay references.
// (Lowercase-name filter removed — the old heuristic dropped useUser etc.)
import { Project, Node, SyntaxKind, type SourceFile } from "ts-morph";

export function functionValuedNames(project: Project): Set<string> {
  const names = new Set<string>();
  for (const sf of project.getSourceFiles()) {
    for (const stmt of sf.getStatements()) {
      if (!Node.isVariableStatement(stmt)) continue;
      for (const decl of stmt.getDeclarations()) {
        const n = decl.getNameNode();
        if (!Node.isIdentifier(n)) continue;
        const init = decl.getInitializer();
        if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) names.add(n.getText());
      }
    }
  }
  return names;
}

export function isFunctionValuedTarget(descriptor: string, names: Set<string>): boolean {
  const base = descriptor.replace(/\./g, "").replace(/\(\)/g, "");
  return names.has(base) || /\(\)\.$/.test(descriptor);
}
export { Node, SyntaxKind };
