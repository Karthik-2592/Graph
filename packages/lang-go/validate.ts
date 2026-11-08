// F7: Go validation notes — receivers (`func (s *S) M()`) and package-level
// nodes handled by the F1 shared core; real scip-go run is manual
// (needs Go toolchain, CI-optional).
export const GO_NOTES = ["receivers map to descriptor parent", "package-level funcs are file children", "one shared core via F1"];
