// Shareable ESLint profile for R2 + R6 (syntactic rules, plan §8.3).
// R3's raw-fetch restriction is included with the sanctioned-client
// override hook; R4/R5 are custom type-aware rules (Task 10).
export const eslintProfile = {
  rules: {
    "no-restricted-syntax": [
      "error",
      { selector: "ImportExpression[source.type!='Literal']", message: "R2: dynamic import() needs a literal specifier" },
      { selector: "CallExpression[callee.name='require'][arguments.0.type!='Literal']", message: "R2: require() needs a literal specifier" },
      { selector: "ImportDeclaration[specifiers.length=0]:not([source.value=/\\.(css|scss|svg)$/])", message: "R6: side-effect import; call an explicit registration function" },
      { selector: "CallExpression[callee.name='fetch']", message: "R3: use callApi(routes.x, …) from the shared contract" },
    ],
  },
  overrides: [
    { files: ["shared/http.ts"], rules: { "no-restricted-syntax": ["error", { selector: "ImportExpression[source.type!='Literal']", message: "R2" }, { selector: "CallExpression[callee.name='require'][arguments.0.type!='Literal']", message: "R2" }, { selector: "ImportDeclaration[specifiers.length=0]:not([source.value=/\\.(css|scss|svg)$/])", message: "R6" }] } },
  ],
};
