// E1: SCIP-to-extractor adapters (AST-based, not regexes).
// Events: literal 1st arg, handler identifier/callback, enclosing scope.
// Contract: sanctioned callApi client, register server (last arg = handler).
import { Project, Node, SyntaxKind } from "ts-morph";
import { extractEvents, extractContract } from "./index.ts";

export type Occurrence = { file: string; line: number; target: string; literalName: string | null; enclosing: string };

export function eventOccurrences(project: Project, busSuffix = "Bus#"): Occurrence[] {
  const out: Occurrence[] = [];
  for (const sf of project.getSourceFiles()) {
    for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const callee = call.getExpression();
      if (!Node.isPropertyAccessExpression(callee)) continue;
      if (!callee.getText().includes("bus.") && !callee.getText().endsWith(`${busSuffix}emit()`) && !callee.getText().endsWith(`${busSuffix}on()`)) continue;
      const arg = call.getArguments()[0];
      const enclosing = call.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration)?.getName() ?? `${sf.getFilePath().split("/").pop()}::`;
      const handler = call.getArguments()[1]?.getText() ?? enclosing;
      out.push({ file: sf.getFilePath(), line: call.getStartLineNumber(), target: callee.getText(), literalName: arg && Node.isStringLiteral(arg) ? arg.getLiteralValue() : null, enclosing: handler });
    }
  }
  return out;
}

export function contractOccurrences(project: Project, sanctioned: { call?: string; register?: string }): { client: { routeSymbol: string; enclosing: string }[]; server: { routeSymbol: string; handler: string }[] } {
  const client: { routeSymbol: string; enclosing: string }[] = [];
  const server: { routeSymbol: string; handler: string }[] = [];
  for (const sf of project.getSourceFiles()) {
    for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const callee = call.getExpression().getText();
      if (sanctioned.call && callee.includes(sanctioned.call.split("::").pop() ?? "")) {
        const route = call.getArguments()[0]?.getText() ?? "";
        client.push({ routeSymbol: route, enclosing: `${sf.getFilePath()}::` });
      }
      if (sanctioned.register && callee.includes(sanctioned.register.split("::").pop() ?? "")) {
        const args = call.getArguments();
        server.push({ routeSymbol: args[1]?.getText() ?? "", handler: args[args.length - 1]?.getText() ?? "" });
      }
    }
  }
  return { client, server };
}
export { extractEvents, extractContract };
