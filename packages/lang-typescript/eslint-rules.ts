// U1: custom type-aware ESLint rules.
// - graph/no-raw-route-registration (R4): only register(router, route, ...handlers)
// - graph/literal-event-name (R5): typed event map + literal names on sanctioned bus
export const noRawRouteRegistration = {
  meta: { type: "problem" as const, docs: { description: "R4: routes must be registered via the sanctioned register()" }, messages: { raw: "R4: use register(router, route, ...handlers)" }, schema: [] },
  create(context: any) {
    return {
      CallExpression(node: any) {
        const name = node.callee?.name ?? node.callee?.property?.name;
        if ((name === "get" || name === "post" || name === "put" || name === "delete" || name === "patch") && node.callee?.object?.name === "router") {
          context.report({ node, messageId: "raw" });
        }
      },
    };
  },
};
export const literalEventName = {
  meta: { type: "problem" as const, docs: { description: "R5: event names must be literals" }, messages: { nonLiteral: "R5: event name must be a literal" }, schema: [] },
  create(context: any) {
    return {
      CallExpression(node: any) {
        const callee = node.callee?.property?.name ?? node.callee?.name;
        if (callee !== "emit" && callee !== "on") return;
        const arg = node.arguments?.[0];
        if (arg && arg.type !== "Literal") context.report({ node: arg, messageId: "nonLiteral" });
      },
    };
  },
};
export const graphPlugin = { rules: { "no-raw-route-registration": noRawRouteRegistration, "literal-event-name": literalEventName } };
