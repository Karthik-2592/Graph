// C5: classify references. Function-valued refs (callbacks, .bind,
// handler tables) stay `references`; type/field refs become file-level
// `uses`. Default L2 projection excludes the latter (the 85% problem).
export type RefClass = "function-valued" | "type-or-field";

export function classifyReference(descriptor: string, line: string): RefClass {
  // Type position: inside `import type`, type annotations, extends/implements.
  if (/^(type|interface):/.test(line) || /:\s*[A-Z]/.test(line) || /extends|implements/.test(line)) return "type-or-field";
  // Field access: `this.store`, `obj.prop` without a following call.
  if (/this\.\w+$/.test(line.trim()) || /\.\w+\s*$/.test(line.trim())) return "type-or-field";
  // Function-valued: callback argument, .bind, handler table member.
  if (/\.bind\(/.test(line) || /,\s*\(?\w+\)?\s*=>/.test(line) || /:\s*\w+[,}]/.test(line)) return "function-valued";
  return "function-valued";
}

export const L2_DEFAULT_KINDS = ["calls", "instantiates", "renders", "references"] as const;
