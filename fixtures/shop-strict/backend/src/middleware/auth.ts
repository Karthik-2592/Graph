import type { Request, Response, NextFunction } from "express";
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!isAuthed(req)) return res.status(401).end();
  next();
}
function isAuthed(req: Request) { return Boolean(req.headers.authorization); }
