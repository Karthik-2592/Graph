// Run: node packages/lang-typescript/site-producers.test.ts
import { newProject, produceSites, fileOutsideProgram } from "./site-producers.ts";
function assert(c: boolean, m: string) { if (!c) { console.error("FAIL:", m); process.exit(1); } }
const p = newProject();
const sf = p.createSourceFile("t.ts", `import "./setup";\nimport("./x");\nfetch("/api");\nbus.emit("ok");\nbus.emit(name);\n`);
const sites = produceSites(sf, "t.ts");
assert(sites.some((s) => s.kind === "side-effect-import"), "G3 side-effect import");
assert(sites.some((s) => s.kind === "dynamic-import"), "G2 non-literal import");
assert(sites.some((s) => s.kind === "network-call"), "G4 raw fetch");
assert(sites.some((s) => s.kind === "event-emit"), "G6 non-literal emit");
assert(fileOutsideProgram(["a.ts", "b.ts"], ["a.ts"]).length === 1, "G1 outside program");
console.log("site-producers.test: all passed");
