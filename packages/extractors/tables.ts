// E2: handler tables. Find `const t = { k: fn, … }` members and
// `t[expr](…)` dispatchers, including cast forms
// `(t as Record<…>)[k](…)`, then expand.
import { Project, Node, SyntaxKind } from "ts-morph";
import { expandHandlerTable } from "../core/declarations.ts";
import type { EdgeRow } from "../core/store.ts";

export function findHandlerTables(project: Project): EdgeRow[] {
  const edges: EdgeRow[] = [];
  for (const sf of project.getSourceFiles()) {
    for (const stmt of sf.getStatements()) {
      if (!Node.isVariableStatement(stmt)) continue;
      for (const decl of stmt.getDeclarations()) {
        const init = decl.getInitializer();
        if (!init || !Node.isObjectLiteralExpression(init)) continue;
        const table = decl.getNameNode().getText();
        const members = init.getProperties().filter((p) => Node.isPropertyAssignment(p)).map((p) => `${sf.getFilePath()}::${p.getNameNode().getText()}.`);
        if (members.length === 0) continue;
        // Dispatchers: t[expr](…) and (t as …)[expr](…)
        for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
          const callee = call.getExpression();
          const text = callee.getText();
          const isDispatch = text.startsWith(`${table}[`) || text.includes(`${table} as`) || /^\(\s*${table}\s+as\b/.test(text);
          if (!isDispatch) continue;
          const enclosing = call.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration)?.getName() ?? `${sf.getFilePath()}::`;
          edges.push(...expandHandlerTable(members, [enclosing]));
        }
      }
    }
  }
  return edges;
}
