import { Router, RequestHandler } from "express";
import { routes, Route } from "../../../shared/routes";
import { requireAuth } from "../middleware/auth";
import { UserController } from "../controllers/userController";
export function register(r: Router, route: Route, ...handlers: RequestHandler[]) {
  (r as any)[route.method.toLowerCase()](route.path, ...handlers);
}
export function buildContractRoutes(users: UserController) {
  const r = Router();
  register(r, routes.getUser, requireAuth, users.get);
  return r;
}
