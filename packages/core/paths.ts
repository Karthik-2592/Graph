// H3: Windows + path tests. All repo-relative paths use forward slashes
// (SCIP spec); runners must normalize backslashes on Windows.
export function toPosix(p: string): string { return p.split("\\").join("/"); }
export function normalizeRepoPath(p: string): string { return toPosix(p).replace(/^\.\//, ""); }
export function isWindowsPath(p: string): boolean { return /^[A-Za-z]:[\\/]/.test(p); }
